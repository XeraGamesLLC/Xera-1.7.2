import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

/**
 * A GET fetcher for untrusted, user-supplied URLs (link-embed unfurling).
 * The threat model is SSRF: a message containing a link to
 * "http://169.254.169.254/..." or "http://internal-admin-panel:8080" must
 * never cause this server to make that request. Mitigations:
 *  - protocol allowlist (http/https only)
 *  - hostname resolved once via DNS, every resulting address checked against
 *    private/reserved ranges before connecting
 *  - the connection is then pinned to that pre-validated address (via the
 *    `lookup` override) so the hostname can't resolve to a different,
 *    disallowed address between validation and connection (DNS rebinding)
 *  - redirects are followed manually, with the same validation repeated on
 *    every hop, capped at a few hops
 *  - request timeout and response size cap
 */

const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 5000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const USER_AGENT = "XRALinkPreviewBot/1.0";

export class SsrfBlockedError extends Error {}

function ipv4ToLong(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

const IPV4_BLOCKED_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // includes 169.254.169.254 cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function isPrivateOrReservedIpv4(ip: string): boolean {
  const long = ipv4ToLong(ip);
  return IPV4_BLOCKED_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (long & mask) === (ipv4ToLong(base) & mask);
  });
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (/^f[cd]/.test(normalized)) return true; // fc00::/7 unique local
  if (/^fe[89ab]/.test(normalized)) return true; // fe80::/10 link-local
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateOrReservedIpv4(mapped[1]);
  return false;
}

function isDisallowedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateOrReservedIpv4(ip);
  if (version === 6) return isPrivateOrReservedIpv6(ip);
  return true; // unrecognizable — refuse rather than guess
}

async function resolveAndValidate(rawHostname: string): Promise<string[]> {
  // node's URL.hostname keeps the brackets around an IPv6 literal (e.g.
  // "[::1]"), which net.isIP() does not recognize — strip them so a literal
  // IPv6 SSRF target is caught by the explicit block below instead of
  // silently falling through to a DNS lookup that happens to fail.
  const hostname = rawHostname.replace(/^\[|\]$/g, "");
  if (hostname.toLowerCase() === "localhost") throw new SsrfBlockedError("localhost is not allowed");
  if (net.isIP(hostname)) {
    if (isDisallowedIp(hostname)) throw new SsrfBlockedError("IP address not allowed");
    return [hostname];
  }
  const records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) throw new SsrfBlockedError("Could not resolve host");
  for (const r of records) {
    if (isDisallowedIp(r.address)) throw new SsrfBlockedError("Host resolves to a disallowed address");
  }
  return records.map((r) => r.address);
}

interface FetchResult {
  body: Buffer;
  contentType: string;
  finalUrl: string;
}

export async function ssrfSafeFetch(
  inputUrl: string,
  opts: { accept?: string; maxBytes?: number } = {}
): Promise<FetchResult> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  let currentUrl = inputUrl;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new SsrfBlockedError("Only http/https URLs are allowed");
    }

    const validIps = await resolveAndValidate(parsed.hostname);
    const pinnedAddress = validIps[0];
    const pinnedFamily = net.isIP(pinnedAddress);

    const result = await new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }>(
      (resolve, reject) => {
        const transport = parsed.protocol === "https:" ? https : http;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        let settled = false;

        const req = transport.request(
          {
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
            path: `${parsed.pathname}${parsed.search}`,
            method: "GET",
            headers: {
              "User-Agent": USER_AGENT,
              Accept: opts.accept ?? "text/html",
            },
            signal: controller.signal,
            // Node's net module defaults to "Happy Eyeballs" (autoSelectFamily),
            // which calls this with { all: true } and expects an array-shaped
            // callback (err, [{address, family}]) rather than the classic
            // dns.lookup 3-arg form — has to be handled explicitly or the
            // connection fails with ERR_INVALID_IP_ADDRESS.
            lookup: (_hostname: string, lookupOpts: unknown, maybeCb: unknown) => {
              const isOptionsObject = typeof lookupOpts !== "function";
              const cb = (isOptionsObject ? maybeCb : lookupOpts) as (...args: any[]) => void;
              const wantsAll = isOptionsObject && (lookupOpts as { all?: boolean }).all;
              if (wantsAll) {
                cb(null, [{ address: pinnedAddress, family: pinnedFamily }]);
              } else {
                cb(null, pinnedAddress, pinnedFamily);
              }
            },
          } as http.RequestOptions,
          (res) => {
            const status = res.statusCode ?? 0;
            const chunks: Buffer[] = [];
            let total = 0;
            res.on("data", (chunk: Buffer) => {
              total += chunk.length;
              if (total > maxBytes) {
                settled = true;
                res.destroy();
                clearTimeout(timeoutId);
                reject(new SsrfBlockedError("Response too large"));
                return;
              }
              chunks.push(chunk);
            });
            res.on("end", () => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              resolve({ status, headers: res.headers, body: Buffer.concat(chunks) });
            });
          }
        );

        req.on("error", (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          reject(err);
        });
        req.end();
      }
    );

    if (result.status >= 300 && result.status < 400 && result.headers.location) {
      currentUrl = new URL(result.headers.location, currentUrl).toString();
      continue;
    }

    if (result.status < 200 || result.status >= 300) {
      throw new SsrfBlockedError(`Unexpected status ${result.status}`);
    }

    return {
      body: result.body,
      contentType: (result.headers["content-type"] as string) ?? "",
      finalUrl: currentUrl,
    };
  }

  throw new SsrfBlockedError("Too many redirects");
}
