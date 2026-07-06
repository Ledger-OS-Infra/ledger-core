/**
 * Wipes all application data for a fresh start (users, businesses, customers, payments).
 * Schema and migrations are untouched.
 *
 *   npm run db:reset -- --confirm
 *
 * On non-local databases, --confirm is required.
 */
import "dotenv/config";
import knex from "knex";
import config from "../knexfile";
import { redis } from "../redis/client";

function databaseHost(): string {
  const url = process.env.DATABASE_URL ?? "";
  try {
    return new URL(url.replace(/^postgres:/, "postgresql:")).hostname;
  } catch {
    return "(unknown)";
  }
}

function isLocalDatabase(): boolean {
  const host = databaseHost();
  return host === "localhost" || host === "127.0.0.1";
}

async function truncateAllTables(): Promise<void> {
  const db = knex(config);

  try {
    await db.raw(`
      TRUNCATE TABLE
        ledger_entries,
        payment_events,
        customer_wallets,
        payment_obligations,
        billing_rules,
        virtual_accounts,
        customers,
        business_members,
        auth_tokens,
        refresh_tokens,
        businesses,
        users
      RESTART IDENTITY CASCADE
    `);
  } finally {
    await db.destroy();
  }
}

async function clearRedisIdempotencyKeys(): Promise<number> {
  let cursor = "0";
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      "idempotency:nomba-event:*",
      "COUNT",
      100,
    );
    cursor = nextCursor;

    if (keys.length > 0) {
      deleted += await redis.del(...keys);
    }
  } while (cursor !== "0");

  return deleted;
}

async function main(): Promise<void> {
  const confirmed = process.argv.includes("--confirm");
  const host = databaseHost();
  const local = isLocalDatabase();

  if (!local && !confirmed) {
    console.error(
      `Refusing to reset remote database (${host}) without --confirm.`,
    );
    console.error("Run: npm run db:reset -- --confirm");
    process.exit(1);
  }

  console.info(`Resetting database at ${host}...`);
  await truncateAllTables();
  console.info("Postgres: all tables truncated.");

  const redisDeleted = await clearRedisIdempotencyKeys();
  console.info(`Redis: cleared ${redisDeleted} Nomba idempotency key(s).`);

  await redis.quit();

  console.info("Done. Sign up again and create a business + customers via the app.");
}

main().catch(async (error) => {
  console.error(error);
  try {
    await redis.quit();
  } catch {
    // ignore
  }
  process.exit(1);
});
