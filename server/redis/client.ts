import Redis from "ioredis";
import { env } from "../config/env";
import { redisConnectionOptions } from "./connection";

let client: Redis | undefined;

/** Lazy Redis client — avoids connecting on import (Vercel cold starts, /health). */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.redisUrl, {
      ...redisConnectionOptions(),
      lazyConnect: true,
      connectTimeout: 10_000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    client.on("error", (err) => {
      console.error("Unexpected Redis client error", err);
    });
  }

  return client;
}

/** Connect if needed before the first command (lazyConnect + enableOfflineQueue: false). */
export async function readyRedis(): Promise<Redis> {
  const r = getRedis();

  if (r.status === "wait" || r.status === "end") {
    await r.connect();
  } else if (r.status === "connecting") {
    await new Promise<void>((resolve, reject) => {
      r.once("ready", () => resolve());
      r.once("error", reject);
    });
  }

  return r;
}

function run<T>(fn: (r: Redis) => Promise<T>): Promise<T> {
  return readyRedis().then(fn);
}

/** Kept for existing imports and test mocks — each call connects on demand. */
export const redis = {
  set: (...args: Parameters<Redis["set"]>) =>
    run((r) => r.set(...args)),
  get: (...args: Parameters<Redis["get"]>) =>
    run((r) => r.get(...args)),
  del: (...args: Parameters<Redis["del"]>) =>
    run((r) => r.del(...args)),
  incr: (...args: Parameters<Redis["incr"]>) =>
    run((r) => r.incr(...args)),
  expire: (key: string, seconds: number) =>
    run((r) => r.expire(key, seconds)),
  scan: (...args: Parameters<Redis["scan"]>) =>
    run((r) => r.scan(...args)),
  quit: (...args: Parameters<Redis["quit"]>) =>
    run((r) => r.quit(...args)),
};
