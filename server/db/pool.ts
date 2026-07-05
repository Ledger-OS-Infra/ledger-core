import { Pool, types } from "pg";
import { databaseConnectionConfig } from "./connection";

// Keep DATE columns as YYYY-MM-DD strings (avoid local timezone shifts on parse).
types.setTypeParser(1082, (value: string) => value);

export const pool = new Pool(databaseConnectionConfig());

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});