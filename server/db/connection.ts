export interface DatabaseConnectionConfig {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
}

/**
 * Shared Postgres connection config for the API pool and Knex migrations.
 * Local Docker: DATABASE_URL only. Aiven / hosted: add ?sslmode=require or DATABASE_SSL=true.
 */
export function databaseConnectionConfig(): DatabaseConnectionConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const sslEnabled =
    process.env.DATABASE_SSL === "true" ||
    /sslmode=require/i.test(connectionString);

  if (!sslEnabled) {
    return { connectionString };
  }

  return {
    connectionString,
    ssl: { rejectUnauthorized: true },
  };
}
