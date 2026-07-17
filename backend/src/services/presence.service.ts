import { redis } from "../lib/redis";
import { prisma } from "../lib/prisma";

const connKey = (userId: string) => `presence:conn:${userId}`;

/** Returns true if this is the user's first active socket connection. */
export async function trackConnect(userId: string): Promise<boolean> {
  const count = await redis.incr(connKey(userId));
  return count === 1;
}

/** Returns true if the user has no more active socket connections. */
export async function trackDisconnect(userId: string): Promise<boolean> {
  const count = await redis.decr(connKey(userId));
  if (count <= 0) {
    await redis.del(connKey(userId));
    return true;
  }
  return false;
}

export async function isOnline(userId: string): Promise<boolean> {
  const count = await redis.get(connKey(userId));
  return Boolean(count && Number(count) > 0);
}

/** Fetches user visibility-adjusted status (INVISIBLE always renders as OFFLINE to others). */
export function publicStatus(status: string): string {
  return status === "INVISIBLE" ? "OFFLINE" : status;
}

export async function onlineUserIdsInGuild(guildId: string): Promise<string[]> {
  const members = await prisma.guildMember.findMany({ where: { guildId }, select: { userId: true } });
  const results = await Promise.all(members.map((m) => isOnline(m.userId)));
  return members.filter((_, i) => results[i]).map((m) => m.userId);
}
