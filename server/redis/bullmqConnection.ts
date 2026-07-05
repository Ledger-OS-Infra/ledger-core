import type { ConnectionOptions } from "bullmq";
import { env } from "../config/env";
import { redisConnectionOptions } from "./connection";

/** BullMQ connection options (avoids ioredis version mismatch with direct client instances). */
export function getBullMqConnection(): ConnectionOptions {
  return {
    url: env.redisUrl,
    maxRetriesPerRequest: null,
    ...redisConnectionOptions(),
  };
}
