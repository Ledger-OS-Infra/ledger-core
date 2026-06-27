import dotenv from "dotenv";
import type { Knex } from "knex";
import { databaseConnectionConfig } from "./db/connection";

dotenv.config();

const config: Knex.Config = {
  client: "pg",
  connection: databaseConnectionConfig(),
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
