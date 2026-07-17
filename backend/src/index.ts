import http from "node:http";
import { app } from "./app";
import { env } from "./config/env";
import { initSockets } from "./sockets";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";

const server = http.createServer(app);

async function main() {
  await initSockets(server);

  server.listen(env.PORT, () => {
    logger.info(`XRA backend listening on :${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch((err) => {
  logger.error("Fatal startup error", err);
  process.exit(1);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close();
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
