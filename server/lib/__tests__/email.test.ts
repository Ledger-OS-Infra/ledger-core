import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/mailer.config", () => ({
  mailer: { sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }) },
}));

vi.mock("../../config/env", () => ({
  env: {
    emailFrom: "Ledger-Core <test@ledger.com>",
    frontendUrl: "http://localhost:3000",
    mailDryRun: true,
    mailSend: false,
  },
}));

import { mailer } from "../../config/mailer.config";
import { sendPasswordResetEmail, sendVerificationEmail } from "../email";

describe("email dry-run", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("prints verification email instead of sending when mailDryRun is on", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendVerificationEmail("user@example.com", "verify-token-123");

    expect(mailer.sendMail).not.toHaveBeenCalled();
    expect(logSpy.mock.calls.flat().join(" ")).toContain("user@example.com");
    expect(logSpy.mock.calls.flat().join(" ")).toContain(
      "http://localhost:3000/auth/verify-email?token=verify-token-123",
    );

    logSpy.mockRestore();
  });

  it("prints password reset email instead of sending when mailDryRun is on", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendPasswordResetEmail("user@example.com", "reset-token-456");

    expect(mailer.sendMail).not.toHaveBeenCalled();
    expect(logSpy.mock.calls.flat().join(" ")).toContain(
      "http://localhost:3000/auth/reset-password?token=reset-token-456",
    );

    logSpy.mockRestore();
  });
});
