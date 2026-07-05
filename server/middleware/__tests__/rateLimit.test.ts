import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("../../config/env", () => ({
  env: { redisUrl: "redis://localhost:6379" },
}));

vi.mock("../../redis/client", () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn(),
    on: vi.fn(),
  },
}));

import { redis } from "../../redis/client";
import { rateLimit } from "../rateLimit";

const mockRedis = redis as unknown as {
  incr: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
};

function makeMockReqRes(body: Record<string, unknown> = {}) {
  const req = {
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
    body,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe("rateLimit middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows requests under the limit", async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    const limiter = rateLimit({
      windowSeconds: 60,
      maxAttempts: 5,
      keyPrefix: "test",
    });

    const { req, res, next } = makeMockReqRes();
    await limiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockRedis.expire).toHaveBeenCalledWith(expect.any(String), 60);
  });

  it("blocks requests over the limit", async () => {
    mockRedis.incr.mockResolvedValue(6);

    const limiter = rateLimit({
      windowSeconds: 60,
      maxAttempts: 5,
      keyPrefix: "test",
    });

    const { req, res, next } = makeMockReqRes();
    await limiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it("includes body field in key when specified", async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    const limiter = rateLimit(
      { windowSeconds: 60, maxAttempts: 5, keyPrefix: "login" },
      "email",
    );

    const { req, res, next } = makeMockReqRes({ email: "test@example.com" });
    await limiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockRedis.incr).toHaveBeenCalledWith(
      expect.stringContaining("test@example.com"),
    );
  });

  it("falls through if Redis is unavailable", async () => {
    mockRedis.incr.mockRejectedValue(new Error("Redis down"));

    const limiter = rateLimit({
      windowSeconds: 60,
      maxAttempts: 5,
      keyPrefix: "test",
    });

    const { req, res, next } = makeMockReqRes();
    await limiter(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
