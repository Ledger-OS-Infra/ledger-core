import fs from "fs";

export interface DatabaseConnectionConfig {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean; ca?: string };
}

/**
 * Shared Postgres connection config for the API pool and Knex migrations.
 *
 * Local Docker: DATABASE_URL only (no SSL).
 * Hosted (Neon / Aiven / RDS): enable SSL via ?sslmode=require, DATABASE_SSL=true,
 * or a recognized host (*.neon.tech).
 *
 * Neon uses publicly trusted certs — TLS verification is on by default.
 * Aiven Postgres signs with a project CA. Supply DATABASE_CA_CERT or
 * DATABASE_CA_CERT_PATH for full verification; without it the connection is
 * still encrypted but skips certificate checks so Aiven works out of the box.
 */
export function databaseConnectionConfig(
  connectionString = process.env.DATABASE_URL,
): DatabaseConnectionConfig {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const sslEnabled =
    process.env.DATABASE_SSL === "true" ||
    /sslmode=/i.test(connectionString) ||
    isNeonHost(connectionString);

  if (!sslEnabled) {
    return { connectionString };
  }

  // Neon uses publicly trusted certs. Ignore leftover Aiven CA files and
  // libpq-only params (channel_binding) that node-postgres does not implement.
  if (isNeonHost(connectionString)) {
    return {
      connectionString: stripQueryParams(connectionString, [
        "sslmode",
        "channel_binding",
      ]),
      ssl: { rejectUnauthorized: true },
    };
  }

  // Strip sslmode from the URL: recent pg/pg-connection-string treats
  // sslmode=require as verify-full and builds its own ssl config that ignores
  // the CA we attach below. Removing it lets our explicit ssl object win.
  const cleanConnectionString = stripQueryParams(connectionString, ["sslmode"]);

  const ca = loadCaCert();
  if (ca) {
    return {
      connectionString: cleanConnectionString,
      ssl: { rejectUnauthorized: true, ca },
    };
  }

  const strict =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" ||
    isPublicCaHost(connectionString);
  return {
    connectionString: cleanConnectionString,
    ssl: { rejectUnauthorized: strict },
  };
}

export function isNeonHost(connectionString: string): boolean {
  try {
    const host = new URL(
      connectionString.replace(/^postgres:/, "postgresql:"),
    ).hostname;
    return host.endsWith(".neon.tech") || host.endsWith(".neon.build");
  } catch {
    return /\.neon\.(tech|build)/i.test(connectionString);
  }
}

function isPublicCaHost(connectionString: string): boolean {
  return isNeonHost(connectionString);
}

function stripQueryParams(connectionString: string, params: string[]): string {
  try {
    const url = new URL(connectionString);
    for (const param of params) {
      url.searchParams.delete(param);
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

function loadCaCert(): string | undefined {
  const inline = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  if (inline && isCompletePem(inline)) {
    return inline;
  }
  const caPath = process.env.DATABASE_CA_CERT_PATH;
  if (caPath) {
    try {
      return fs.readFileSync(caPath, "utf8");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        console.warn(
          `DATABASE_CA_CERT_PATH not found (${caPath}); falling back to encrypted connection without CA verification. On Vercel, set DATABASE_CA_CERT to the PEM contents instead of a file path.`,
        );
        return undefined;
      }
      throw err;
    }
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
