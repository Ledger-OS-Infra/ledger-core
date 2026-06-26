import dotenv from "dotenv";

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
  nombaWebhookSecret: required("NOMBA_WEBHOOK_SECRET"),
  nombaWebhookPath: process.env.NOMBA_WEBHOOK_PATH ?? "/webhooks/nomba",
};
