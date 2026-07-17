import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { verifyAccessToken } from "../utils/jwt";
import { redis } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { corsOrigins } from "../config/env";
import { logger } from "../lib/logger";
import { trackConnect, trackDisconnect, publicStatus } from "../services/presence.service";
import { assertChannelPermission } from "../services/permission.service";
import { registerMessageHandlers } from "./handlers/message.handler";

let io: Server | null = null;

export function getIo(): Server {
  if (!io) throw new Error("Socket.IO server not initialized yet");
  return io;
}

export function emitToGuild(guildId: string, event: string, payload: unknown) {
  io?.to(`guild:${guildId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToChannel(channelId: string, event: string, payload: unknown) {
  io?.to(`channel:${channelId}`).emit(event, payload);
}

export async function initSockets(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    maxHttpBufferSize: 1e6, // 1MB — messages carry text only, files go via REST upload
  });

  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Missing auth token"));
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.username = payload.username;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => handleConnection(socket));

  logger.info("Socket.IO server initialized");
  return io;
}

function handleConnection(socket: Socket) {
  const userId: string = socket.data.userId;
  socket.join(`user:${userId}`);

  // Every listener is registered synchronously, before any `await` runs, so
  // a client that emits immediately after "connect" (e.g. channel:subscribe
  // fired from its own connect handler) can never race ahead of the server
  // being ready to receive it — Socket.IO drops events with no listener
  // registered yet, it does not queue them.
  let joinedGuildIds: string[] = [];

  registerMessageHandlers(socket);

  socket.on("channel:subscribe", async ({ channelId }: { channelId: string }, ack?: (ok: boolean) => void) => {
    try {
      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (channel?.guildId) {
        await assertChannelPermission(channelId, userId, "VIEW_CHANNEL");
      } else {
        const membership = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId, userId } } });
        if (!membership) throw new Error("Not a participant of this DM");
      }
      socket.join(`channel:${channelId}`);
      ack?.(true);
    } catch {
      ack?.(false);
    }
  });

  socket.on("channel:unsubscribe", ({ channelId }: { channelId: string }) => {
    socket.leave(`channel:${channelId}`);
  });

  socket.on("disconnect", async () => {
    const isFullyOffline = await trackDisconnect(userId);
    if (isFullyOffline) {
      await prisma.user.update({ where: { id: userId }, data: { status: "OFFLINE" } }).catch(() => undefined);
      broadcastPresence(userId, joinedGuildIds, "OFFLINE");
    }
  });

  (async () => {
    const [memberships, dmChannels] = await Promise.all([
      prisma.guildMember.findMany({ where: { userId }, select: { guildId: true } }),
      prisma.channelMember.findMany({ where: { userId }, select: { channelId: true } }),
    ]);

    joinedGuildIds = memberships.map((m) => m.guildId);
    for (const m of memberships) socket.join(`guild:${m.guildId}`);
    for (const c of dmChannels) socket.join(`channel:${c.channelId}`);

    const isFirstConnection = await trackConnect(userId);
    if (isFirstConnection) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.status === "OFFLINE") {
        await prisma.user.update({ where: { id: userId }, data: { status: "ONLINE" } });
      }
      const currentStatus = user?.status === "OFFLINE" ? "ONLINE" : user?.status ?? "ONLINE";
      broadcastPresence(userId, joinedGuildIds, publicStatus(currentStatus));
    }
  })().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[sockets] post-connect setup failed", err);
  });
}

function broadcastPresence(userId: string, guildIds: string[], status: string) {
  for (const guildId of guildIds) {
    emitToGuild(guildId, "presence:update", { userId, status });
  }
}
