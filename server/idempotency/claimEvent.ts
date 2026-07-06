import { pool } from "../db/pool";
import { logger } from "../lib/logger";
import { readyRedis } from "../redis/client";

const KEY_PREFIX = "idempotency:nomba-event:";
const TTL_SECONDS = 60 * 60 * 24 * 3; // 3 days

function usePostgresIdempotency(): boolean {
  return (
    process.env.VERCEL === "1" ||
    process.env.IDEMPOTENCY_BACKEND === "postgres"
  );
}

/** Postgres dedupe — used on Vercel where Aiven Valkey is often unreachable (no static IPs). */
async function claimEventPostgres(eventId: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: number }>(
    `SELECT 1 AS exists FROM payment_events WHERE idempotency_key = $1 LIMIT 1`,
    [eventId],
  );

  if (rows.length > 0) {
    logger.warn({ eventId }, "Duplicate Nomba event detected, skipping processing");
    return false;
  }

  return true;
}

export async function claimEvent(eventId: string): Promise<boolean> {
  if (usePostgresIdempotency()) {
    return claimEventPostgres(eventId);
  }

  const key = KEY_PREFIX + eventId;

  try {
    const redis = await readyRedis();
    const result = await redis.set(key, "1", "EX", TTL_SECONDS, "NX");

    if (result === null) {
      logger.warn({ eventId }, "Duplicate Nomba event detected, skipping processing");
      return false;
    }

    return true;
  } catch (err) {
    logger.warn(
      { err, eventId },
      "Redis idempotency claim failed, falling back to Postgres",
    );
    return claimEventPostgres(eventId);
  }
}

export async function releaseEvent(eventId: string): Promise<void> {
  if (usePostgresIdempotency()) {
    return;
  }

  const key = KEY_PREFIX + eventId;
  try {
    const redis = await readyRedis();
    await redis.del(key);
  } catch (err) {
    logger.warn({ err, eventId }, "Failed to release Redis idempotency claim");
  }
}
