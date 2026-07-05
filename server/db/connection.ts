import fs from "fs";

export interface DatabaseConnectionConfig {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean; ca?: string };
}

/**
 * Shared Postgres connection config for the API pool and Knex migrations.
 *
 * Local Docker: DATABASE_URL only (no SSL).
 * Hosted (Aiven / Neon / RDS): enable SSL via ?sslmode=require or DATABASE_SSL=true.
 *
 * Managed providers like Aiven present a certificate signed by their own
 * project CA, so full verification fails against the public CA bundle. Supply
 * the provider CA (DATABASE_CA_CERT or DATABASE_CA_CERT_PATH) to keep strict
 * verification; without it we fall back to an encrypted-but-unverified
 * connection so the DB works out of the box.
 */
export function databaseConnectionConfig(): DatabaseConnectionConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const sslEnabled =
    process.env.DATABASE_SSL === "true" ||
    /sslmode=/i.test(connectionString);

  if (!sslEnabled) {
    return { connectionString };
  }

  // Strip sslmode from the URL: recent pg/pg-connection-string treats
  // sslmode=require as verify-full and builds its own ssl config that ignores
  // the CA we attach below. Removing it lets our explicit ssl object win.
  const cleanConnectionString = stripQueryParam(connectionString, "sslmode");

  const ca = loadCaCert();
  if (ca) {
    return {
      connectionString: cleanConnectionString,
      ssl: { rejectUnauthorized: true, ca },
    };
  }

  const strict = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";
  return {
    connectionString: cleanConnectionString,
    ssl: { rejectUnauthorized: strict },
  };
}

function stripQueryParam(connectionString: string, param: string): string {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete(param);
    return url.toString();
  } catch {
    return connectionString;
  }
}

function loadCaCert(): string | undefined {
  const inline = process.env.DATABASE_CA_CERT;
  if (inline && isCompletePem(inline)) {
    return inline;
  }
  const caPath = process.env.DATABASE_CA_CERT_PATH;
  if (caPath) {
    return fs.readFileSync(caPath, "utf8");
  }
  return undefined;
}

/**
 * Guards against a common .env mistake: pasting a multi-line PEM unquoted, which
 * dotenv truncates to just the first line ("-----BEGIN CERTIFICATE-----"). An
 * incomplete CA silently breaks TLS, so we ignore it and fall back to the file.
 */
export function isCompletePem(value: string): boolean {
  return (
    value.includes("-----BEGIN CERTIFICATE-----") &&
    value.includes("-----END CERTIFICATE-----")
  );
}
