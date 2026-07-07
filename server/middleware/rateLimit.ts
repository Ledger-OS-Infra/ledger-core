import type { NextFunction, Request, Response } from "express";
import { redis } from "../redis/client";

interface RateLimitOptions {
  windowSeconds: number;
  maxAttempts: number;
  keyPrefix: string;
}

/**
 * Redis-backed sliding-window rate limiter.
 * Key is built from the prefix + client IP + optional body field (e.g. email).
 */
export function rateLimit(options: RateLimitOptions, bodyField?: string) {
  const { windowSeconds, maxAttempts, keyPrefix } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const extra = bodyField ? String((req.body as Record<string, unknown>)?.[bodyField] ?? "") : "";
    const key = `ratelimit:${keyPrefix}:${ip}:${extra}`;

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > maxAttempts) {
        res.status(429).json({
          error: {
            message: "Too many requests. Please try again later.",
            code: "RATE_LIMITED",
          },
        });
        return;
      }

      next();
    } catch {
      // If Redis is down, allow the request through — don't block auth
      next();
    }
  };
}

export const loginRateLimit = rateLimit(
  { windowSeconds: 15 * 60, maxAttempts: 10, keyPrefix: "login" },
  "email",
);

export const forgotPasswordRateLimit = rateLimit(
  { windowSeconds: 60 * 60, maxAttempts: 5, keyPrefix: "forgot-pw" },
  "email",
);

export const signupRateLimit = rateLimit(
  { windowSeconds: 60 * 60, maxAttempts: 10, keyPrefix: "signup" },
);

export const refreshRateLimit = rateLimit(
  { windowSeconds: 15 * 60, maxAttempts: 30, keyPrefix: "refresh" },
);

export const resetPasswordRateLimit = rateLimit(
  { windowSeconds: 60 * 60, maxAttempts: 10, keyPrefix: "reset-pw" },
);

export const portalLookupRateLimit = rateLimit(
  { windowSeconds: 15 * 60, maxAttempts: 10, keyPrefix: "portal-lookup" },
  "account_number",
);