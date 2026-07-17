import Redis from "ioredis";
import { env } from "../config/env";

// Single shared connection used for: rate-limit counters, refresh-token
// revocation set, presence cache, and the Socket.IO Redis adapter (so this
// can later scale beyond one process/server without a rewrite).
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
});

redis.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});
