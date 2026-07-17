import crypto from "node:crypto";
import { env } from "../config/env";

/**
 * Discord-accurate auth token: three dot-separated base64url segments —
 * the user's ID, their current tokenVersion, and an HMAC signature over
 * both. Unlike a JWT there's no expiry claim and no refresh dance: the
 * token is valid forever, for any number of requests, until User.tokenVersion
 * changes. That happens on logout or password reset (see auth.service.ts) —
 * bumping it makes the HMAC on every previously-issued token stop matching,
 * which invalidates them all at once with no per-token DB row or blocklist
 * needed. This intentionally trades the "assume breach, rotate constantly"
 * posture of the old JWT-access/refresh-rotation design for matching how
 * Discord's own tokens actually behave, at the user's explicit request.
 */

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromB64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(userId: string, tokenVersion: number): string {
  return crypto.createHmac("sha256", env.JWT_ACCESS_SECRET).update(`${userId}.${tokenVersion}`).digest("base64url");
}

export function issueToken(userId: string, tokenVersion: number): string {
  const part1 = b64url(userId);
  const part2 = b64url(String(tokenVersion));
  const part3 = sign(userId, tokenVersion);
  return `${part1}.${part2}.${part3}`;
}

export interface DecodedToken {
  userId: string;
  tokenVersion: number;
}

/** Structural decode only — does NOT verify the signature against the DB's current tokenVersion. Callers must do that. */
export function decodeToken(token: string): DecodedToken | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const userId = fromB64url(parts[0]);
    const tokenVersion = Number(fromB64url(parts[1]));
    if (!userId || !Number.isInteger(tokenVersion)) return null;
    const expectedSig = sign(userId, tokenVersion);
    if (!crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expectedSig))) return null;
    return { userId, tokenVersion };
  } catch {
    return null;
  }
}
