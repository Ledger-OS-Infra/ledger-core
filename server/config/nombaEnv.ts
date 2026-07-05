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

/** Nomba API credentials only — safe to import from CLI scripts that do not need Postgres/Redis. */
export const nombaConfig: NombaClientConfig = {
  baseUrl: required("NOMBA_API_BASE_URL"),
  parentAccountId: required("NOMBA_PARENT_ACCOUNT_ID"),
  subAccountId: required("NOMBA_SUB_ACCOUNT_ID"),
  clientId: required("NOMBA_CLIENT_ID"),
  clientSecret: required("NOMBA_CLIENT_SECRET"),
};
