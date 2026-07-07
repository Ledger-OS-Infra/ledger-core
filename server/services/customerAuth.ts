import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { AppError } from "../lib/AppError";
import { logger } from "../lib/logger";
import {
  findCustomerByEmailWithPassword,
  updateCustomerPasswordHash,
} from "../db/customers";
import {
  hashToken,
  insertCustomerAuthToken,
  invalidateCustomerAuthTokens,
  findValidCustomerAuthToken,
  markCustomerAuthTokenUsed,
} from "../db/customerAuthTokens";
import { sendCustomerPasswordResetEmail } from "../lib/email";
import { signPortalToken } from "./portalAuth";
import { env } from "../config/env";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

// ── Login ────────────────────────────────────────────────

export async function customerLogin(input: {
  email: string;
  password: string;
}): Promise<{ token: string; expires_in: string }> {
  const customer = await findCustomerByEmailWithPassword(input.email);

  // Always hash even on a miss, to keep timing roughly constant.
  if (!customer || !customer.password_hash) {
    await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(input.password, customer.password_hash);
  if (!valid) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (customer.status === "INACTIVE") {
    throw new AppError("This account is inactive", 403, "ACCOUNT_INACTIVE");
  }

  const token = signPortalToken(customer.id);
  return { token, expires_in: env.portalTokenExpiresIn };
}

// ── Forgot password ─────────────────────────────────────────

export async function customerForgotPassword(email: string): Promise<{ message: string }> {
  const genericMessage =
    "If an account with that email exists, we sent password reset instructions.";

  const customer = await findCustomerByEmailWithPassword(email);
  if (!customer) {
    return { message: genericMessage };
  }

  const resetToken = generateOpaqueToken();
  const resetTokenHash = hashToken(resetToken);

  await invalidateCustomerAuthTokens(customer.id);
  await insertCustomerAuthToken({
    customerId: customer.id,
    tokenHash: resetTokenHash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  try {
    await sendCustomerPasswordResetEmail(email, resetToken);
  } catch (err) {
    logger.error({ err, customerId: customer.id }, "Failed to send customer password reset email");
  }

  return { message: genericMessage };
}

// ── Reset password ──────────────────────────────────────────

export async function customerResetPassword(input: {
  token: string;
  password: string;
}): Promise<{ message: string }> {
  const tokenHash = hashToken(input.token);
  const record = await findValidCustomerAuthToken(tokenHash);

  if (!record) {
    throw new AppError("Invalid or expired reset link", 400, "INVALID_TOKEN");
  }

  const newHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  await markCustomerAuthTokenUsed(record.id);
  await updateCustomerPasswordHash(record.customer_id, newHash);

  return { message: "Password reset successfully. You can now log in." };
}