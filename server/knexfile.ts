import dotenv from "dotenv";
import type { Knex } from "knex";
import { databaseConnectionConfig } from "./db/connection";

dotenv.config();

const config: Knex.Config = {
  client: "pg",
  // Neon pooler (PgBouncer) does not support some migration DDL. Prefer the
  // direct host when both URLs are set.
  connection: databaseConnectionConfig(
    process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL,
  ),
  migrations: {
    directory: "./db/migrations",
    extension: "ts",
  },
  seeds: {
    directory: "./db/seeds",
    extension: "ts",
  },
};

export default config;
