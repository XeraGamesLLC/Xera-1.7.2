import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { logger } from "../lib/logger";

/**
 * Anti-VPN/proxy signup gate — STUBBED BY DESIGN (see CHECKLIST.md).
 *
 * This middleware is wired into the signup route already, so turning on
 * real VPN/proxy blocking later is a one-file change instead of a new
 * feature. Right now, with ANTI_VPN_ENABLED=false, it's a no-op that just
 * logs the signup IP.
 *
 * To wire up a real provider later:
 *   1. Pick a provider (e.g. IPQualityScore, ipdata, IPinfo) and put its API
 *      key in ANTI_VPN_API_KEY.
 *   2. Set ANTI_VPN_ENABLED=true.
 *   3. Replace the body of `checkIp` below with a fetch() call to that
 *      provider's fraud-score/proxy-detection endpoint, and return
 *      { blocked: true, reason } when it flags the IP as VPN/proxy/datacenter.
 */
async function checkIp(ip: string): Promise<{ blocked: boolean; reason?: string }> {
  if (!env.ANTI_VPN_ENABLED) {
    return { blocked: false };
  }

  // ANTI_VPN_ENABLED=true but no provider implemented yet — fail open with a
  // loud warning rather than silently blocking (or silently not blocking)
  // real signups. Replace this block once a provider is wired up.
  logger.warn(
    "ANTI_VPN_ENABLED=true but no provider is implemented in checkIp() — failing open.",
    { ip }
  );
  return { blocked: false };
}

export async function antiVpnGate(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? "unknown";
  const result = await checkIp(ip);

  if (result.blocked) {
    return res.status(403).json({ error: "Signups from VPNs/proxies are not allowed." });
  }

  next();
}
