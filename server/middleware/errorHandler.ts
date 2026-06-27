import type { ErrorRequestHandler } from "express";
import { AppError } from "../lib/AppError";
import { logger } from "../lib/logger";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  logger.error({ err }, "Unhandled error");

  res.status(500).json({
    error: {
      message: "Something went wrong",
      code: "INTERNAL_ERROR",
    },
  });
};