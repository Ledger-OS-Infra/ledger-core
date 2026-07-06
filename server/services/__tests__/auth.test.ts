import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../../lib/AppError";

vi.mock("../../config/env", () => ({
  env: {
    jwtSecret: "test-secret-key-for-unit-tests",
    jwtAccessExpiresIn: "30m",
    jwtRefreshExpiresIn: "7d",
    smtpHost: "smtp.test",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "test@ledger.com",
    smtpPass: "test",
    emailFrom: "test@ledger.com",
    frontendUrl: "http://localhost:3000",
    authRequireEmailVerification: true,
    nombaSubAccountId: "sub-account-test-id",
  },
}));

vi.mock("../../db/pool", () => ({
  pool: {
    connect: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock("../../db/users", () => ({
  insertUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  markEmailVerified: vi.fn(),
  updatePasswordHash: vi.fn(),
}));

vi.mock("../../db/authTokens", () => ({
  insertAuthToken: vi.fn(),
  invalidateTokensByUserAndType: vi.fn(),
  findValidAuthToken: vi.fn(),
  markTokenUsed: vi.fn(),
  hashToken: vi.fn((t: string) => `hashed_${t}`),
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
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { pool } from "../../db/pool";
import {
  findUserByEmail,
  findUserById,
  insertUser,
  markEmailVerified,
  updatePasswordHash,
} from "../../db/users";
import {
  findValidAuthToken,
  insertAuthToken,
  invalidateTokensByUserAndType,
  markTokenUsed,
} from "../../db/authTokens";
import {
  insertRefreshToken,
  revokeAllRefreshTokens,
} from "../../db/refreshTokens";
import {
  insertBusinessMember,
  listBusinessMembershipsByUser,
} from "../../db/businessMembers";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../lib/email";
import * as authService from "../auth";

function mockTransactionClient() {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const release = vi.fn();
  vi.mocked(pool.connect).mockResolvedValue({ query, release } as never);
  return { query, release };
}

const testPasswordHash = bcrypt.hashSync("Password123", 4);

const activeUser = {
  id: "user-1",
  email: "test@example.com",
  password_hash: testPasswordHash,
  full_name: "Test User",
  status: "active" as const,
  email_verified_at: "2026-07-01T00:00:00Z",
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

const unverifiedUser = {
  ...activeUser,
  id: "user-2",
  email_verified_at: null,
};

describe("Auth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Signup ──────────────────────────────────────────

  describe("signup", () => {
    it("creates user and sends verification email (no business yet)", async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null);
      const { query, release } = mockTransactionClient();
      vi.mocked(insertUser).mockResolvedValue(activeUser);
      vi.mocked(insertAuthToken).mockResolvedValue({} as never);
      vi.mocked(invalidateTokensByUserAndType).mockResolvedValue(undefined);

      const result = await authService.signup({
        fullName: "Test User",
        email: "test@example.com",
        password: "Password123",
      });

      expect(result.message).toContain("check your email");
      expect(query).toHaveBeenCalledWith("BEGIN");
      expect(insertUser).toHaveBeenCalled();
      // Signup must NOT auto-create a business — that's an explicit step now.
      expect(query).not.toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO businesses"),
        expect.anything(),
      );
      expect(insertBusinessMember).not.toHaveBeenCalled();
      expect(insertAuthToken).toHaveBeenCalledWith(
        expect.objectContaining({ type: "email_verify" }),
        expect.anything(),
      );
      expect(query).toHaveBeenCalledWith("COMMIT");
      expect(release).toHaveBeenCalled();

      expect(sendVerificationEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.any(String),
      );
    });

    it("rejects duplicate email", async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(activeUser);

      await expect(
        authService.signup({
          fullName: "Test",
          email: "test@example.com",
          password: "Password123",
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: "EMAIL_TAKEN",
      });
    });

    it("rolls back on insert failure", async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null);
      const { query } = mockTransactionClient();
      vi.mocked(insertUser).mockRejectedValue(new Error("db error"));

      await expect(
        authService.signup({
          fullName: "Test",
          email: "test@example.com",
          password: "Password123",
        }),
      ).rejects.toThrow("db error");

      expect(query).toHaveBeenCalledWith("ROLLBACK");
    });
  });

  // ── Login ───────────────────────────────────────────

  describe("login", () => {
    it("returns tokens for valid verified user", async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(activeUser);
      vi.mocked(insertRefreshToken).mockResolvedValue({} as never);

      const result = await authService.login({
        email: "test@example.com",
        password: "Password123",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe("test@example.com");

      const decoded = jwt.verify(result.accessToken, "test-secret-key-for-unit-tests") as {
        sub: string;
      };
      expect(decoded.sub).toBe("user-1");
    });

    it("rejects invalid password", async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(activeUser);

      await expect(
        authService.login({ email: "test@example.com", password: "wrong" }),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    });

    it("rejects non-existent email without leaking info", async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null);

      await expect(
        authService.login({ email: "nobody@example.com", password: "Password123" }),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    });

    it("rejects unverified user when verification is required", async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(unverifiedUser);

      await expect(
        authService.login({ email: "test@example.com", password: "Password123" }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "EMAIL_NOT_VERIFIED",
      });
    });

    it("rejects suspended user", async () => {
      vi.mocked(findUserByEmail).mockResolvedValue({
        ...activeUser,
        status: "suspended",
      });

      await expect(
        authService.login({ email: "test@example.com", password: "Password123" }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "ACCOUNT_SUSPENDED",
      });
    });
  });

  // ── Verify email ────────────────────────────────────

  describe("verifyEmail", () => {
    it("marks user verified and consumes token", async () => {
      const tokenRecord = {
        id: "tok-1",
        user_id: "user-2",
        type: "email_verify" as const,
        token_hash: "hashed_abc",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
      };
      vi.mocked(findValidAuthToken).mockResolvedValue(tokenRecord);
      const { query, release } = mockTransactionClient();
      vi.mocked(markTokenUsed).mockResolvedValue(undefined);
      vi.mocked(markEmailVerified).mockResolvedValue(undefined);

      const result = await authService.verifyEmail("abc");

      expect(result.message).toContain("verified");
      expect(markTokenUsed).toHaveBeenCalledWith("tok-1", expect.anything());
      expect(markEmailVerified).toHaveBeenCalledWith("user-2", expect.anything());
      expect(query).toHaveBeenCalledWith("COMMIT");
      expect(release).toHaveBeenCalled();
    });

    it("rejects invalid or expired token", async () => {
      vi.mocked(findValidAuthToken).mockResolvedValue(null);

      await expect(authService.verifyEmail("bad-token")).rejects.toMatchObject({
        statusCode: 400,
        code: "INVALID_TOKEN",
      });
    });
  });

  // ── Forgot password ─────────────────────────────────

  describe("forgotPassword", () => {
    it("sends reset email for existing user", async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(activeUser);
      const { query, release } = mockTransactionClient();
      vi.mocked(invalidateTokensByUserAndType).mockResolvedValue(undefined);
      vi.mocked(insertAuthToken).mockResolvedValue({} as never);

      const result = await authService.forgotPassword("test@example.com");

      expect(result.message).toContain("If an account");
      expect(query).toHaveBeenCalledWith("COMMIT");
      expect(release).toHaveBeenCalled();

      await vi.waitFor(() => {
        expect(sendPasswordResetEmail).toHaveBeenCalledWith(
          "test@example.com",
          expect.any(String),
        );
      });
    });

    it("returns generic message for non-existent email", async () => {
      vi.mocked(findUserByEmail).mockResolvedValue(null);

      const result = await authService.forgotPassword("unknown@example.com");

      expect(result.message).toContain("If an account");
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  // ── Reset password ──────────────────────────────────

  describe("resetPassword", () => {
    it("updates password and revokes refresh tokens", async () => {
      const tokenRecord = {
        id: "tok-reset-1",
        user_id: "user-1",
        type: "password_reset" as const,
        token_hash: "hashed_resettoken",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
      };
      vi.mocked(findValidAuthToken).mockResolvedValue(tokenRecord);
      const { query, release } = mockTransactionClient();
      vi.mocked(markTokenUsed).mockResolvedValue(undefined);
      vi.mocked(updatePasswordHash).mockResolvedValue(undefined);
      vi.mocked(revokeAllRefreshTokens).mockResolvedValue(undefined);

      const result = await authService.resetPassword({
        token: "resettoken",
        password: "NewPassword456",
      });

      expect(result.message).toContain("reset successfully");
      expect(markTokenUsed).toHaveBeenCalledWith("tok-reset-1", expect.anything());
      expect(updatePasswordHash).toHaveBeenCalledWith(
        "user-1",
        expect.any(String),
        expect.anything(),
      );
      expect(revokeAllRefreshTokens).toHaveBeenCalledWith("user-1", expect.anything());
      expect(query).toHaveBeenCalledWith("COMMIT");
      expect(release).toHaveBeenCalled();
    });

    it("rejects invalid reset token", async () => {
      vi.mocked(findValidAuthToken).mockResolvedValue(null);

      await expect(
        authService.resetPassword({ token: "invalid", password: "NewPw123456" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "INVALID_TOKEN",
      });
    });
  });

  // ── Get me ──────────────────────────────────────────

  describe("getMe", () => {
    it("returns user profile with workspaces", async () => {
      vi.mocked(findUserById).mockResolvedValue(activeUser);
      vi.mocked(listBusinessMembershipsByUser).mockResolvedValue([
        {
          id: "bm-1",
          business_id: "biz-1",
          user_id: "user-1",
          role: "owner",
          joined_at: "2026-07-01",
          business_name: "My Workspace",
          created_at: "2026-07-01",
          updated_at: "2026-07-01",
        },
      ]);

      const result = await authService.getMe("user-1");

      expect(result.id).toBe("user-1");
      expect(result.email).toBe("test@example.com");
      expect(result.emailVerified).toBe(true);
      expect(result.workspaces).toHaveLength(1);
      expect(result.workspaces[0].role).toBe("owner");
    });

    it("throws 404 for unknown user", async () => {
      vi.mocked(findUserById).mockResolvedValue(null);

      await expect(authService.getMe("missing")).rejects.toMatchObject({
        statusCode: 404,
        code: "USER_NOT_FOUND",
      });
    });
  });

  // ── Access token verification ───────────────────────

  describe("verifyAccessToken", () => {
    it("decodes a valid token", () => {
      const token = jwt.sign(
        { sub: "user-1", email: "test@example.com" },
        "test-secret-key-for-unit-tests",
        { expiresIn: "30m" },
      );

      const payload = authService.verifyAccessToken(token);
      expect(payload.sub).toBe("user-1");
      expect(payload.email).toBe("test@example.com");
    });

    it("throws on expired token", () => {
      const token = jwt.sign(
        { sub: "user-1", email: "test@example.com" },
        "test-secret-key-for-unit-tests",
        { expiresIn: "0s" },
      );

      expect(() => authService.verifyAccessToken(token)).toThrow(AppError);
    });

    it("throws on tampered token", () => {
      const token = jwt.sign(
        { sub: "user-1" },
        "wrong-secret",
        { expiresIn: "30m" },
      );

      expect(() => authService.verifyAccessToken(token)).toThrow(AppError);
    });
  });
});
