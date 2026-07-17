import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates+coerces req.body/query/params against zod schemas before the
 * route handler runs. This is the app's primary input-validation layer —
 * every mutating route uses it, so malformed/oversized/unexpected fields
 * never reach the database or business logic.
 */
export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err: any) {
      return res.status(400).json({
        error: "Validation failed",
        details: err?.errors ?? String(err),
      });
    }
  };
}
