import Redis from "ioredis";
import { env } from "../config/env";
import { redisConnectionOptions } from "./connection";

export const redis = new Redis(env.redisUrl, redisConnectionOptions());

redis.on("error", (err) => {
  console.error("Unexpected Redis client error", err);
});
