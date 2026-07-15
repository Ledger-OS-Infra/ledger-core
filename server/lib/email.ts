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

export async function sendCustomerWelcomeEmail(
  email: string,
  fullName: string,
  tempPassword: string,
  businessName: string,
): Promise<void> {
  const link = `${env.customerPortalUrl}/`;

  await sendEmail({
    to: email,
    subject: `You've been added as a customer of ${businessName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="margin-bottom: 16px;">Welcome, ${fullName}</h2>
        <p>${businessName} has added you as a customer on Ledger-Core. You can now log in to your customer portal to view your balance, obligations, and payment history.</p>

        <p style="margin-top: 24px;"><strong>Your login details</strong></p>
        <p style="margin: 4px 0;">Email: ${email}</p>
        <p style="margin: 4px 0;">
          Temporary password: <strong>${tempPassword}</strong>
          <br/>
          <span style="color: #b45309; font-size: 13px;">
            This is a temporary password. Please set a new one by clicking "Forgot password" on the login page before you continue.
          </span>
        </p>

        <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0;">
          Go to login page
        </a>
        <p style="color: #666; font-size: 14px;">Or copy this link: <br/>${link}</p>
      </div>
    `,
  });
}

export async function sendCustomerPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const link = `${env.customerPortalUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Reset your customer portal password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="margin-bottom: 16px;">Password Reset</h2>
        <p>You requested a password reset for your customer portal account. Click the button below to set a new password:</p>
        <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 24px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">Or copy this link: <br/>${link}</p>
        <p style="color: #999; font-size: 12px;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}
