import dotenv from "dotenv";
import type { NombaClientConfig } from "../nomba/types";

dotenv.config();

export type NombaEnvironment = "sandbox" | "production";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getNombaEnvironment(): NombaEnvironment {
  const value = process.env.NOMBA_ENV?.trim().toLowerCase();
  if (value === "production" || value === "live") {
    return "production";
  }
  return "sandbox";
}

function optionalOrFallback(primary: string, fallback: string): string {
  const value = process.env[primary]?.trim();
  if (value) return value;
  return required(fallback);
}

function loadLiveConfig(): NombaClientConfig {
  return {
    baseUrl: required("NOMBA_API_BASE_URL"),
    parentAccountId: required("NOMBA_PARENT_ACCOUNT_ID"),
    subAccountId: required("NOMBA_SUB_ACCOUNT_ID"),
    clientId: required("NOMBA_CLIENT_ID"),
    clientSecret: required("NOMBA_CLIENT_SECRET"),
  };
}

/** Sandbox credentials — NOMBA_SANDBOX_* for URL/keys; parent/sub fall back to live IDs if omitted. */
export function loadSandboxConfig(): NombaClientConfig {
  return {
    baseUrl: required("NOMBA_SANDBOX_API_BASE_URL"),
    parentAccountId: optionalOrFallback(
      "NOMBA_SANDBOX_PARENT_ACCOUNT_ID",
      "NOMBA_PARENT_ACCOUNT_ID",
    ),
    subAccountId: optionalOrFallback(
      "NOMBA_SANDBOX_SUB_ACCOUNT_ID",
      "NOMBA_SUB_ACCOUNT_ID",
    ),
    clientId: required("NOMBA_SANDBOX_CLIENT_ID"),
    clientSecret: required("NOMBA_SANDBOX_CLIENT_SECRET"),
  };
}

export const nombaEnvironment = getNombaEnvironment();

/** Active Nomba config — live when NOMBA_ENV=production, else sandbox. */
export const nombaConfig =
  nombaEnvironment === "production" ? loadLiveConfig() : loadSandboxConfig();

export const nombaSandboxConfig = loadSandboxConfig();
