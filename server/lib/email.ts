import { mailer } from "../config/mailer.config";
import { env } from "../config/env";
import { logger } from "./logger";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

function shouldSendEmail(): boolean {
  if (env.mailSend) return true;
  return !env.mailDryRun;
}

function extractActionLink(html: string): string | undefined {
  const match = html.match(/href="([^"]+)"/);
  return match?.[1];
}

function printDryRunEmail(input: SendEmailInput): void {
  const link = extractActionLink(input.html);

  console.log("\n=== Email (dry-run — not sent) ===");
  console.log(`To:      ${input.to}`);
  console.log(`From:    ${env.emailFrom}`);
  console.log(`Subject: ${input.subject}`);
  if (link) {
    console.log(`Link:    ${link}`);
  }
  console.log("================================\n");
}

async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!shouldSendEmail()) {
    printDryRunEmail(input);
    return;
  }

  try {
    const info = await mailer.sendMail({
      from: env.emailFrom,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    logger.info(
      { to: input.to, subject: input.subject, messageId: info.messageId },
      "Email sent",
    );
  } catch (err) {
    logger.error({ err, to: input.to, subject: input.subject }, "Failed to send email");
    throw err;
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const link = `${env.frontendUrl}/auth/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Verify your Ledger-Core email",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="margin-bottom: 16px;">Welcome to Ledger-Core</h2>
        <p>Click the button below to verify your email address:</p>
        <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">Or copy this link: <br/>${link}</p>
        <p style="color: #999; font-size: 12px;">This link expires in 24 hours.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const link = `${env.frontendUrl}/auth/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Reset your Ledger-Core password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="margin-bottom: 16px;">Password Reset</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">Or copy this link: <br/>${link}</p>
        <p style="color: #999; font-size: 12px;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}
