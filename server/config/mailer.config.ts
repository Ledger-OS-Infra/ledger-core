import nodemailer from "nodemailer";
import { env } from "./env";

/**
 * Shared SMTP transport (Nodemailer). Works with any SMTP provider — Gmail,
 * Outlook, etc. For Gmail/Outlook personal accounts, SMTP_PASS must be an
 * app password (not the account password), with 2FA enabled.
 *
 * Port 587 → STARTTLS (SMTP_SECURE=false); port 465 → implicit TLS (SMTP_SECURE=true).
 */
export const mailer = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});
