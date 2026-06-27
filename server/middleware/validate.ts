import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

interface ValidateSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

export function validate(schemas: ValidateSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        // req.query is read-only in Express 5, so the validated/defaulted
        // version goes on res.locals instead of overwriting it.
        res.locals.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        res.locals.params = schemas.params.parse(req.params);
      }
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: {
            message: "Validation failed",
            code: "VALIDATION_ERROR",
            details: err.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        });
        return;
      }
      next(err);
    }
  };
}