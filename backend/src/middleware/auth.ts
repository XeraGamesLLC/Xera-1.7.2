import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      username?: string;
    }
  }
}

/** Requires a valid JWT access token in the Authorization header. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    req.userId = payload.sub;
    req.username = payload.username;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}

/** Like requireAuth but doesn't reject if no token is present — just skips attaching req.userId. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice("Bearer ".length));
      req.userId = payload.sub;
      req.username = payload.username;
    } catch {
      // ignore invalid token in optional mode
    }
  }
  next();
}
