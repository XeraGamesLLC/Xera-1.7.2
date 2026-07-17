import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import { AppError } from "../middleware/errorHandler";
import { isBlocked } from "./friend.service";

export async function getOrCreateDmChannel(userId: string, otherUserId: string) {
  if (userId === otherUserId) throw new AppError(400, "Can't DM yourself");
  if (await isBlocked(userId, otherUserId)) throw new AppError(403, "You can't message this user");

  const existing = await prisma.channel.findFirst({
    where: {
      type: "DM",
      members: { some: { userId } },
      AND: { members: { some: { userId: otherUserId } } },
    },
    include: { members: true },
  });
  if (existing && existing.members.length === 2) return existing;

  return prisma.channel.create({
    data: {
      id: generateSnowflake(),
      type: "DM",
      name: "",
      members: { create: [{ userId }, { userId: otherUserId }] },
    },
    include: { members: true },
  });
}

export async function createGroupDm(creatorId: string, participantIds: string[], name?: string | null) {
  const uniqueParticipants = [...new Set([creatorId, ...participantIds])];
  for (const pid of participantIds) {
    if (await isBlocked(creatorId, pid)) throw new AppError(403, "Can't add a blocked user to a group DM");
  }

  return prisma.channel.create({
    data: {
      id: generateSnowflake(),
      type: "GROUP_DM",
      name: name ?? "",
      members: { create: uniqueParticipants.map((userId) => ({ userId })) },
    },
    include: { members: { include: { user: { select: { id: true, username: true, discriminator: true, avatarUrl: true } } } } },
  });
}

export async function listDmChannels(userId: string) {
  const channels = await prisma.channel.findMany({
    where: { type: { in: ["DM", "GROUP_DM"] }, members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, discriminator: true, avatarUrl: true, status: true, customStatus: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return channels;
}

export async function leaveGroupDm(channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.type !== "GROUP_DM") throw new AppError(404, "Group DM not found");
  await prisma.channelMember.delete({ where: { channelId_userId: { channelId, userId } } });
}

export async function addToGroupDm(channelId: string, actorId: string, newUserId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId }, include: { members: true } });
  if (!channel || channel.type !== "GROUP_DM") throw new AppError(404, "Group DM not found");
  if (!channel.members.some((m) => m.userId === actorId)) throw new AppError(403, "Not a participant");
  if (channel.members.length >= 10) throw new AppError(400, "Group DM is full");

  await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId, userId: newUserId } },
    create: { channelId, userId: newUserId },
    update: {},
  });
}
