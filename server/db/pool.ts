import { Pool, types } from "pg";
import { databaseConnectionConfig, isNeonHost } from "./connection";

// Keep DATE columns as YYYY-MM-DD strings (avoid local timezone shifts on parse).
types.setTypeParser(1082, (value: string) => value);

const connection = databaseConnectionConfig();
const neon = isNeonHost(connection.connectionString);

export const pool = new Pool({
  ...connection,
  // Neon closes idle clients and free-tier compute sleeps. Keep the pool small
  // and recycle sooner so we don't hold dead sockets after a scale-to-zero.
  ...(neon
    ? {
        max: 10,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 15_000,
      }
    : {}),
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});
