import dotenv from "dotenv";
import type { NombaClientConfig } from "../nomba/types";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3050),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),
  nombaWebhookSecret: required("NOMBA_WEBHOOK_SECRET"),
  nombaWebhookPath: process.env.NOMBA_WEBHOOK_PATH ?? "/webhooks/nomba",

  jwtSecret: required("JWT_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "30m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",

  // SMTP (Nodemailer) — e.g. Gmail or Outlook
  smtpHost: required("SMTP_HOST"),
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587
  smtpUser: required("SMTP_USER"),
  smtpPass: required("SMTP_PASS"),
  emailFrom: process.env.EMAIL_FROM ?? "Ledger-Core <rajiabdullahi907@gmail.com>",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",

  authRequireEmailVerification:
    process.env.AUTH_REQUIRE_EMAIL_VERIFICATION !== "false",

  nombaSubAccountId: required("NOMBA_SUB_ACCOUNT_ID"),
};

export const nombaConfig: NombaClientConfig = {
  baseUrl: required("NOMBA_API_BASE_URL"),
  parentAccountId: required("NOMBA_PARENT_ACCOUNT_ID"),
  subAccountId: required("NOMBA_SUB_ACCOUNT_ID"),
  clientId: required("NOMBA_CLIENT_ID"),
  clientSecret: required("NOMBA_CLIENT_SECRET"),
};