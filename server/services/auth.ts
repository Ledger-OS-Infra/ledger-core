import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../lib/AppError";
import { logger } from "../lib/logger";
import { env } from "../config/env";
import { pool } from "../db/pool";
import {
  insertUser,
  findUserByEmail,
  findUserById,
  markEmailVerified,
  updatePasswordHash,
  type UserRow,
} from "../db/users";
import {
  insertAuthToken,
  invalidateTokensByUserAndType,
  findValidAuthToken,
  markTokenUsed,
  hashToken,
} from "../db/authTokens";
import {
  insertRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} from "../db/refreshTokens";
import { listBusinessMembershipsByUser } from "../db/businessMembers";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email";

const BCRYPT_ROUNDS = 12;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

function signAccessToken(user: UserRow): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
  };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtAccessExpiresIn as string & jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

function parseRefreshExpiresMs(): number {
  const raw = env.jwtRefreshExpiresIn;
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const num = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return num * (multipliers[unit] ?? 1000);
}

// ────────────────────────────────────────
// Signup
// ────────────────────────────────────────

export async function signup(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<{ message: string }> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AppError("Email already registered", 409, "EMAIL_TAKEN");
  }

  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const verifyToken = generateOpaqueToken();
  const verifyTokenHash = hashToken(verifyToken);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await insertUser(
      {
        id: userId,
        email: input.email,
        passwordHash,
        fullName: input.fullName,
      },
      client,
    );

    // A business/workspace is NOT created here — the user creates one
    // explicitly after logging in (see POST /businesses). Each workspace is
    // tied to the team's shared Nomba sub-account.

    await invalidateTokensByUserAndType(userId, "email_verify", client);
    await insertAuthToken(
      {
        userId,
        type: "email_verify",
        tokenHash: verifyTokenHash,
        expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      },
      client,
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Fire-and-forget email — don't block signup response
  sendVerificationEmail(input.email, verifyToken).catch((err) => {
    logger.error({ err, userId }, "Failed to send verification email");
  });

  return {
    message: "Account created. Please check your email to verify your account.",
  };
}

// ────────────────────────────────────────
// Login
// ────────────────────────────────────────

export async function login(input: {
  email: string;
  password: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string };
}> {
  const user = await findUserByEmail(input.email);

  // Constant-time-ish path: always hash even if user doesn't exist
  if (!user) {
    await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (user.status === "suspended") {
    throw new AppError("Account suspended", 403, "ACCOUNT_SUSPENDED");
  }

  if (env.authRequireEmailVerification && !user.email_verified_at) {
    throw new AppError(
      "Please verify your email before logging in",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }

  const accessToken = signAccessToken(user);
  const rawRefreshToken = generateOpaqueToken();
  const refreshHash = hashToken(rawRefreshToken);
  const refreshExpiresAt = new Date(Date.now() + parseRefreshExpiresMs());

  await insertRefreshToken({
    userId: user.id,
    tokenHash: refreshHash,
    expiresAt: refreshExpiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
    },
  };
}

// ────────────────────────────────────────
// Verify email
// ────────────────────────────────────────

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const tokenHash = hashToken(token);
  const record = await findValidAuthToken(tokenHash, "email_verify");

  if (!record) {
    throw new AppError(
      "Invalid or expired verification link",
      400,
      "INVALID_TOKEN",
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await markTokenUsed(record.id, client);
    await markEmailVerified(record.user_id, client);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { message: "Email verified successfully. You can now log in." };
}

// ────────────────────────────────────────
// Forgot password
// ────────────────────────────────────────

export async function forgotPassword(email: string): Promise<{ message: string }> {
  // Always return same response to prevent email enumeration
  const genericMessage =
    "If an account with that email exists, we sent password reset instructions.";

  const user = await findUserByEmail(email);
  if (!user) {
    return { message: genericMessage };
  }

  const resetToken = generateOpaqueToken();
  const resetTokenHash = hashToken(resetToken);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await invalidateTokensByUserAndType(user.id, "password_reset", client);
    await insertAuthToken(
      {
        userId: user.id,
        type: "password_reset",
        tokenHash: resetTokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
      client,
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  sendPasswordResetEmail(email, resetToken).catch((err) => {
    logger.error({ err, userId: user.id }, "Failed to send password reset email");
  });

  return { message: genericMessage };
}

// ────────────────────────────────────────
// Reset password
// ────────────────────────────────────────

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<{ message: string }> {
  const tokenHash = hashToken(input.token);
  const record = await findValidAuthToken(tokenHash, "password_reset");

  if (!record) {
    throw new AppError(
      "Invalid or expired reset link",
      400,
      "INVALID_TOKEN",
    );
  }

  const newHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await markTokenUsed(record.id, client);
    await updatePasswordHash(record.user_id, newHash, client);
    await revokeAllRefreshTokens(record.user_id, client);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { message: "Password reset successfully. You can now log in." };
}

// ────────────────────────────────────────
// Get current user (for /auth/me)
// ────────────────────────────────────────

export async function getMe(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  const memberships = await listBusinessMembershipsByUser(userId);

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    emailVerified: user.email_verified_at !== null,
    status: user.status,
    workspaces: memberships.map((m) => ({
      businessId: m.business_id,
      name: m.business_name,
      role: m.role,
    })),
  };
}

// ────────────────────────────────────────
// Refresh access token
// ────────────────────────────────────────

export async function refreshAccessToken(rawRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const tokenHash = hashToken(rawRefreshToken);
  const record = await findValidRefreshToken(tokenHash);

  if (!record) {
    throw new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  const user = await findUserById(record.user_id);
  if (!user || user.status === "suspended") {
    throw new AppError("Account not available", 403, "ACCOUNT_UNAVAILABLE");
  }

  // Rotate: revoke old, issue new
  const newRawToken = generateOpaqueToken();
  const newHash = hashToken(newRawToken);
  const newExpiresAt = new Date(Date.now() + parseRefreshExpiresMs());

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await revokeRefreshToken(record.id, client);
    await insertRefreshToken(
      { userId: user.id, tokenHash: newHash, expiresAt: newExpiresAt },
      client,
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return {
    accessToken: signAccessToken(user),
    refreshToken: newRawToken,
  };
}

// ────────────────────────────────────────
// Verify access token (used by middleware)
// ────────────────────────────────────────

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.jwtSecret, {
      algorithms: ["HS256"],
    }) as AccessTokenPayload;
  } catch {
    throw new AppError("Invalid or expired access token", 401, "INVALID_ACCESS_TOKEN");
  }
}
