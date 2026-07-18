import type { Request, Response, NextFunction } from "express";
import { isIpBanned } from "../services/ipBan.service";

/** Blocks every request from a banned IP, including login/register — a
 * banned IP can't just create a fresh account to route around the ban. */
export async function ipBanGate(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? "unknown";
  if (await isIpBanned(ip)) {
    return res.status(403).json({ error: "This IP address has been banned from the platform." });
  }
  next();
}
