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
  nombaWebhookSecret: required("NOMBA_WEBHOOK_SECRET"),
  nombaWebhookPath: process.env.NOMBA_WEBHOOK_PATH ?? "/webhooks/nomba",
};

export const nombaConfig: NombaClientConfig = {
  baseUrl: required("NOMBA_API_BASE_URL"),
  parentAccountId: required("NOMBA_PARENT_ACCOUNT_ID"),
  subAccountId: required("NOMBA_SUB_ACCOUNT_ID"),
  clientId: required("NOMBA_CLIENT_ID"),
  clientSecret: required("NOMBA_CLIENT_SECRET"),
};
