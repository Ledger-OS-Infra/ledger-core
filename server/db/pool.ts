import { Pool } from "pg";
import { databaseConnectionConfig } from "./connection";

export const pool = new Pool(databaseConnectionConfig());

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});