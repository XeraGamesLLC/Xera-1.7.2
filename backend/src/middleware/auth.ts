import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Requires a valid token in the Authorization header (see utils/token.ts for the format). */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const user = await verifyToken(header.slice("Bearer ".length));
  if (!user) {
    return res.status(401).json({ error: "Invalid or revoked token" });
  }
  req.userId = user.id;
  next();
}

/** Like requireAuth but doesn't reject if no token is present — just skips attaching req.userId. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const user = await verifyToken(header.slice("Bearer ".length));
    if (user) req.userId = user.id;
  }
  next();
}
