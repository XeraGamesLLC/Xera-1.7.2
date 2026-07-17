import rateLimit from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import type { RequestHandler } from "express";
import { redis } from "../lib/redis";
import { env } from "../config/env";

function makeStore(prefix: string) {
  return new RedisStore({
    sendCommand: (...args: string[]) =>
      (redis.call as (...a: string[]) => Promise<RedisReply>)(...args),
    prefix: `rl:${prefix}:`,
  });
}

/** General-purpose API limiter — applied to every request. */
export const generalLimiter: RequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("general"),
  message: { error: "Too many requests, slow down." },
});

/**
 * Strict limiter for auth endpoints (login/register/password-reset) — the
 * highest-value targets for credential stuffing and brute force. Keyed by IP
 * only (pre-auth, no user id available yet).
 */
export const authLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("auth"),
  message: { error: "Too many attempts. Try again in a few minutes." },
});

/** Even stricter limiter specifically for login, to slow brute force on a single account. */
export const loginLimiter: RequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("login"),
  keyGenerator: (req) => `${req.ip}:${(req.body?.email ?? "").toLowerCase()}`,
  message: { error: "Too many login attempts for this account. Try again later." },
});

export const uploadLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("upload"),
  message: { error: "Too many uploads, slow down." },
});

/**
 * Manual Redis-backed sliding-window-ish counter for use outside Express
 * (Socket.IO event handlers), e.g. message send rate limiting per user.
 * Returns true if the action is allowed, false if the caller is over budget.
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const redisKey = `rl:manual:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSeconds);
  }
  return count <= limit;
}
