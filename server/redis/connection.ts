import fs from "fs";
import type { RedisOptions } from "ioredis";
import { env } from "../config/env";
import { isCompletePem } from "../db/connection";

/**
 * Shared Redis/Valkey connection options for the direct client and BullMQ.
 *
 * Local Docker: redis://localhost:6379 (no TLS).
 * Hosted (Aiven Valkey): the Service URI uses the rediss:// scheme (TLS).
 *
 * NOTE: Aiven Valkey (*.c.aivencloud.com) presents a publicly-trusted Let's
 * Encrypt certificate — unlike Aiven Postgres, which uses the private project
 * CA. So Node's default trust store verifies it and we must NOT attach the
 * Postgres project CA here (setting tls.ca replaces the default roots and would
 * break verification of the Let's Encrypt chain). Only attach a custom CA when
 * one is explicitly configured for Redis.
 */
export function redisConnectionOptions(): RedisOptions {
  const tlsEnabled =
    env.redisUrl.startsWith("rediss://") || process.env.REDIS_TLS === "true";

  if (!tlsEnabled) {
    return {};
  }

  const ca = loadRedisCaCert();
  const rejectUnauthorized =
    process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false";

  return {
    tls: ca ? { ca, rejectUnauthorized } : { rejectUnauthorized },
  };
}

function loadRedisCaCert(): string | undefined {
  const inline = process.env.REDIS_CA_CERT;
  if (inline && isCompletePem(inline)) {
    return inline;
  }
  const caPath = process.env.REDIS_CA_CERT_PATH;
  if (caPath) {
    return fs.readFileSync(caPath, "utf8");
  }
  return undefined;
}
