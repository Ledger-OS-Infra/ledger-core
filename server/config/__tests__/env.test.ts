import { afterEach, describe, expect, it, vi } from "vitest";

function stubAppEnv() {
  vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
  vi.stubEnv("REDIS_URL", "redis://localhost:6379");
  vi.stubEnv("JWT_SECRET", "jwt-secret");
  vi.stubEnv("SMTP_HOST", "smtp.test");
  vi.stubEnv("SMTP_USER", "user");
  vi.stubEnv("SMTP_PASS", "pass");
}

function stubFlutterwaveEnv() {
  vi.stubEnv("FLW_ENV", "sandbox");
  vi.stubEnv("FLW_API_BASE_URL", "https://developersandbox-api.flutterwave.com");
  vi.stubEnv("FLW_PUBLIC_KEY", "FLWPUBK_TEST-public");
  vi.stubEnv("FLW_SECRET_KEY", "FLWSECK_TEST-secret");
  vi.stubEnv("FLW_ENCRYPTION_KEY", "enc-key");
  vi.stubEnv("FLW_SECRET_HASH", "webhook-hash");
  vi.stubEnv("FLW_WEBHOOK_PATH", "/webhooks/flutterwave");
}

describe("env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("loads Flutterwave config at startup", async () => {
    stubAppEnv();
    stubFlutterwaveEnv();

    const { env } = await import("../env");

    expect(env.flutterwaveConfig).toEqual({
      environment: "sandbox",
      baseUrl: "https://developersandbox-api.flutterwave.com",
      publicKey: "FLWPUBK_TEST-public",
      secretKey: "FLWSECK_TEST-secret",
      encryptionKey: "enc-key",
      secretHash: "webhook-hash",
      webhookPath: "/webhooks/flutterwave",
    });
  });

  it("treats FLW_ENV=live as production", async () => {
    stubAppEnv();
    stubFlutterwaveEnv();
    vi.stubEnv("FLW_ENV", "live");

    const { env } = await import("../env");

    expect(env.flutterwaveConfig.environment).toBe("production");
  });

  it("fails to start when required Flutterwave variables are missing", async () => {
    stubAppEnv();
    stubFlutterwaveEnv();
    vi.stubEnv("FLW_SECRET_KEY", "");

    await expect(import("../env")).rejects.toThrow(
      "Missing required environment variable: FLW_SECRET_KEY",
    );
  });
});
