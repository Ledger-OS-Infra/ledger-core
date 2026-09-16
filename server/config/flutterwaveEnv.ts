import dotenv from "dotenv";

dotenv.config();

export type FlutterwaveEnvironment = "sandbox" | "production";

export interface FlutterwaveConfig {
  environment: FlutterwaveEnvironment;
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  encryptionKey: string;
  /** Dashboard secret hash — HMAC-SHA256 of the raw webhook body vs `flutterwave-signature`. */
  secretHash: string;
  webhookPath: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getFlutterwaveEnvironment(
  value = process.env.FLW_ENV,
): FlutterwaveEnvironment {
  const raw = value?.trim().toLowerCase();
  if (raw === "production" || raw === "live") {
    return "production";
  }
  if (raw === "sandbox" || raw === "test") {
    return "sandbox";
  }

  throw new Error(
    'Missing or invalid FLW_ENV. Expected "sandbox" or "production".',
  );
}

/** Flutterwave credentials — required at application startup. */
export function loadFlutterwaveConfig(): FlutterwaveConfig {
  if (process.env.NODE_ENV === "test") {
    return {
      environment: "sandbox",
      baseUrl: "https://sandbox.flutterwave.com",
      publicKey: "test-public-key",
      secretKey: "test-secret-key",
      encryptionKey: "test-encryption-key",
      secretHash: "test-secret-hash",
      webhookPath: "/webhooks/flutterwave",
    };
  }

  return {
    environment: getFlutterwaveEnvironment(),
    baseUrl: required("FLW_API_BASE_URL"),
    publicKey: required("FLW_PUBLIC_KEY"),
    secretKey: required("FLW_SECRET_KEY"),
    encryptionKey: required("FLW_ENCRYPTION_KEY"),
    secretHash: required("FLW_SECRET_HASH"),
    webhookPath: required("FLW_WEBHOOK_PATH"),
  };
}
