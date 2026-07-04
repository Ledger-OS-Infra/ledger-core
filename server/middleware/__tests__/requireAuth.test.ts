import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

vi.mock("../../config/env", () => ({
  env: {
    jwtSecret: "test-secret",
    jwtAccessExpiresIn: "30m",
    jwtRefreshExpiresIn: "7d",
    authRequireEmailVerification: true,
    databaseUrl: "postgresql://test:test@localhost:5432/test",
    redisUrl: "redis://localhost:6379",
  },
}));

vi.mock("../../db/pool", () => ({
  pool: { connect: vi.fn(), query: vi.fn() },
}));

vi.mock("../../db/users", () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  insertUser: vi.fn(),
  markEmailVerified: vi.fn(),
  updatePasswordHash: vi.fn(),
}));

vi.mock("../../db/authTokens", () => ({
  insertAuthToken: vi.fn(),
  invalidateTokensByUserAndType: vi.fn(),
  findValidAuthToken: vi.fn(),
  markTokenUsed: vi.fn(),
  hashToken: vi.fn(),
}));

vi.mock("../../db/refreshTokens", () => ({
  insertRefreshToken: vi.fn(),
  findValidRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  revokeAllRefreshTokens: vi.fn(),
}));

vi.mock("../../db/businessMembers", () => ({
  insertBusinessMember: vi.fn(),
  listBusinessMembershipsByUser: vi.fn(),
}));

vi.mock("../../lib/email", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

import { requireAuth } from "../requireAuth";

function makeMockReqRes(authHeader?: string) {
  const req = {
    header: vi.fn((name: string) =>
      name.toLowerCase() === "authorization" ? authHeader : undefined,
    ),
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe("requireAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes with valid token and sets req.user", () => {
    const token = jwt.sign(
      { sub: "user-1", email: "test@example.com" },
      "test-secret",
      { expiresIn: "30m" },
    );
    const { req, res, next } = makeMockReqRes(`Bearer ${token}`);

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.sub).toBe("user-1");
  });

  it("rejects when no authorization header", () => {
    const { req, res, next } = makeMockReqRes(undefined);

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects malformed header (no Bearer prefix)", () => {
    const { req, res, next } = makeMockReqRes("Basic abc123");

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects expired token", () => {
    const token = jwt.sign(
      { sub: "user-1", email: "test@example.com" },
      "test-secret",
      { expiresIn: "0s" },
    );
    const { req, res, next } = makeMockReqRes(`Bearer ${token}`);

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects token signed with wrong secret", () => {
    const token = jwt.sign(
      { sub: "user-1", email: "test@example.com" },
      "wrong-secret",
      { expiresIn: "30m" },
    );
    const { req, res, next } = makeMockReqRes(`Bearer ${token}`);

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
