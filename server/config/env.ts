import dotenv from "dotenv";
import { nombaConfig, nombaEnvironment } from "./nombaEnv";

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
  nombaWebhookPath: "/webhooks/nomba",

  jwtSecret: required("JWT_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "30m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",

   // Customer-portal session tokens 
  portalJwtSecret: process.env.PORTAL_JWT_SECRET ?? required("JWT_SECRET"),
  portalTokenExpiresIn: process.env.PORTAL_TOKEN_EXPIRES_IN ?? "20m",

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

  /** Print emails to console instead of SMTP (test runs and MAIL_DRY_RUN=true). */
  mailDryRun:
    process.env.NODE_ENV === "test" || process.env.MAIL_DRY_RUN === "true",
  /** Force real SMTP even when mailDryRun would apply (e.g. manual send check). */
  mailSend: process.env.MAIL_SEND === "true",

  nombaSubAccountId: nombaConfig.subAccountId,
  nombaEnvironment,
};

export { nombaConfig, nombaEnvironment };