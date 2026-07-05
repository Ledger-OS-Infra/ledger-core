import knex from "knex";
import config from "../../knexfile";

export default async function globalSetup() {
  const db = knex(config);
  await db.migrate.latest();
  await db.destroy();
}
