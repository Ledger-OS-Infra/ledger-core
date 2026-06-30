import { redis } from "../redis/client";
import { logger } from "../lib/logger";

const KEY_PREFIX = "idempotency:nomba-event:";
const TTL_SECONDS = 60 * 60 * 24 * 3; // 3 days

export async function claimEvent(eventId: string): Promise<boolean> {
  const key = KEY_PREFIX + eventId;

  const result = await redis.set(key, "1", "EX", TTL_SECONDS, "NX");

  if (result === null) {
    logger.warn({ eventId }, "Duplicate Nomba event detected, skipping processing");
    return false;
  }

  return true;
}

export async function releaseEvent(eventId: string): Promise<void> {
  const key = KEY_PREFIX + eventId;
  await redis.del(key);
}