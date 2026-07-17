import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Intentionally 4 args — Express only treats a handler as an error handler
// when it has this exact arity.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }

  logger.error("Unhandled error", { err, path: req.path, method: req.method });

  // Never leak stack traces / internal details to clients.
  return res.status(500).json({ error: "Internal server error" });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}
