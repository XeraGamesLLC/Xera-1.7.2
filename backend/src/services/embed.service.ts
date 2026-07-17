import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { redis } from "../lib/redis";
import { env } from "../config/env";
import { ssrfSafeFetch, SsrfBlockedError } from "../utils/ssrfSafeFetch";

const CACHE_TTL_SECONDS = 60 * 60;
const EMBED_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const EMBEDS_DIR = path.join(env.UPLOAD_DIR, "embeds");

export interface ResolvedEmbed {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
}

export function firstUrlIn(content: string): string | null {
  const match = content.match(/https?:\/\/[^\s<>"']+/);
  return match ? match[0] : null;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractMeta(html: string, prop: string): string | null {
  const propPattern = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${propPattern}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${propPattern}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const value = decodeHtmlEntities(match[1]).trim();
      if (value) return value; // an empty content="" attribute counts as missing, not present
    }
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!match) return null;
  const value = decodeHtmlEntities(match[1]).trim();
  return value || null;
}

async function cacheImageLocally(imageUrl: string, baseUrl: string): Promise<string | null> {
  try {
    const absolute = new URL(imageUrl, baseUrl).toString();
    const { body, contentType } = await ssrfSafeFetch(absolute, { accept: "image/*", maxBytes: EMBED_IMAGE_MAX_BYTES });
    if (!contentType.toLowerCase().startsWith("image/")) return null;

    const ext = contentType.split("/")[1]?.split(";")[0]?.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "img";
    fs.mkdirSync(EMBEDS_DIR, { recursive: true });
    const filename = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(EMBEDS_DIR, filename), body);
    return `/uploads/embeds/${filename}`;
  } catch {
    // Embeds are a best-effort nicety — never let a broken/blocked image
    // fetch take down the whole embed.
    return null;
  }
}

async function resolveUncached(url: string): Promise<ResolvedEmbed | null> {
  try {
    const { body, contentType, finalUrl } = await ssrfSafeFetch(url, { accept: "text/html" });
    if (!contentType.toLowerCase().includes("text/html")) return null;

    const html = body.toString("utf8");
    const title = extractMeta(html, "og:title") ?? extractTitleTag(html);
    const description = extractMeta(html, "og:description") ?? extractMeta(html, "description");
    const siteName = extractMeta(html, "og:site_name");
    const ogImage = extractMeta(html, "og:image");

    if (!title && !description && !ogImage) return null;

    const imageUrl = ogImage ? await cacheImageLocally(ogImage, finalUrl) : null;

    return {
      url,
      title: title ? title.slice(0, 256) : null,
      description: description ? description.slice(0, 512) : null,
      imageUrl,
      siteName: siteName ? siteName.slice(0, 128) : null,
    };
  } catch (err) {
    if (err instanceof SsrfBlockedError) return null;
    return null;
  }
}

/** Resolves (and Redis-caches) Open Graph metadata for a URL, Discord-style link unfurling. */
export async function resolveEmbedForUrl(url: string): Promise<ResolvedEmbed | null> {
  const cacheKey = `embed:${crypto.createHash("sha256").update(url).digest("hex")}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached !== null) {
    if (cached === "null") return null;
    try {
      return JSON.parse(cached) as ResolvedEmbed;
    } catch {
      // corrupt cache entry, fall through and re-resolve
    }
  }

  const resolved = await resolveUncached(url);
  await redis.set(cacheKey, resolved ? JSON.stringify(resolved) : "null", "EX", CACHE_TTL_SECONDS).catch(() => undefined);
  return resolved;
}
