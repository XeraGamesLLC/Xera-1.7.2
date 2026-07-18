import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { verifyToken } from "../services/auth.service";
import { redis } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { corsOrigins } from "../config/env";
import { logger } from "../lib/logger";
import { trackConnect, trackDisconnect, publicStatus } from "../services/presence.service";
import { assertChannelPermission } from "../services/permission.service";
import { isIpBanned } from "../services/ipBan.service";
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

  io.use(async (socket, next) => {
    // socket.io doesn't honor Express's "trust proxy" setting, so the
    // real client IP has to be read off x-forwarded-for by hand here,
    // same header the reverse proxy sets that req.ip resolves from on
    // the HTTP side.
    const forwardedFor = socket.handshake.headers["x-forwarded-for"];
    const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0].trim()) || socket.handshake.address;
    try {
      if (await isIpBanned(ip)) return next(new Error("This IP address has been banned from the platform."));
    } catch (err) {
      // Same "must never take the whole process down" reasoning as
      // ipBanGate.ts on the HTTP side — an async io.use middleware that
      // throws becomes an unhandled rejection, which crashes the entire
      // Node process, not just this one connection.
      logger.error("socket IP ban check failed open due to an error checking the ban list", { err });
    }

    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token"));
    const user = await verifyToken(token);
    if (!user) return next(new Error("Invalid or revoked token"));
    socket.data.userId = user.id;
    next();
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
      // "Offline" here is purely a live/derived state (no active socket
      // connections, tracked in Redis by trackConnect/trackDisconnect) - it
      // must never be written to User.status, which is the user's actual
      // chosen preference (ONLINE/IDLE/DND/INVISIBLE). Persisting "OFFLINE"
      // here used to clobber that preference on every disconnect, so it was
      // always lost and reset to ONLINE the next time they logged back in.
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
      // The DB default for a brand-new account is OFFLINE (accurate before
      // their first-ever connection) - flip that one-time default to ONLINE
      // on first connect. Any other stored value here is a real preference
      // the user explicitly chose and must be left untouched.
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
