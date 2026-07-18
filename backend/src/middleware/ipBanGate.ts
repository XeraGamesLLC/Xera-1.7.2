import type { Request, Response, NextFunction } from "express";
import { isIpBanned } from "../services/ipBan.service";
import { logger } from "../lib/logger";

/** Blocks every request from a banned IP, including login/register — a
 * banned IP can't just create a fresh account to route around the ban. */
export async function ipBanGate(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? "unknown";
  try {
    if (await isIpBanned(ip)) {
      return res.status(403).json({ error: "This IP address has been banned from the platform." });
    }
    next();
  } catch (err) {
    // This runs on literally every request, before auth — a DB hiccup or
    // (as actually happened once) a pending migration must never crash the
    // whole process over it. Fail open and log loudly instead, same
    // philosophy as the anti-VPN gate.
    logger.error("ipBanGate failed open due to an error checking the ban list", { err });
    next();
  }
}
