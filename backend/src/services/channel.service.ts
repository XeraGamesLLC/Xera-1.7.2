import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "./auditLog.service";

export async function createCategory(guildId: string, name: string) {
  const count = await prisma.category.count({ where: { guildId } });
  return prisma.category.create({ data: { id: generateSnowflake(), guildId, name, position: count } });
}

export async function createChannel(
  guildId: string,
  actorId: string,
  input: { name: string; type: "TEXT" | "VOICE"; categoryId?: string | null; topic?: string | null }
) {
  const count = await prisma.channel.count({ where: { guildId } });
  const channel = await prisma.channel.create({
    data: {
      id: generateSnowflake(),
      guildId,
      name: input.name.toLowerCase(),
      type: input.type,
      categoryId: input.categoryId ?? null,
      topic: input.topic ?? null,
      position: count,
    },
  });
  await logAudit({ guildId, actorId, action: "CHANNEL_CREATE", targetId: channel.id });
  return channel;
}

export async function updateChannel(
  channelId: string,
  guildId: string,
  actorId: string,
  data: Partial<{ name: string; topic: string | null; categoryId: string | null; position: number; slowmodeSeconds: number; isNsfw: boolean }>
) {
  const channel = await prisma.channel.update({ where: { id: channelId }, data });
  await logAudit({ guildId, actorId, action: "CHANNEL_UPDATE", targetId: channelId });
  return channel;
}

export async function deleteChannel(channelId: string, guildId: string, actorId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.guildId !== guildId) throw new AppError(404, "Channel not found");

  await prisma.channel.delete({ where: { id: channelId } });
  await logAudit({ guildId, actorId, action: "CHANNEL_DELETE", targetId: channelId, metadata: { name: channel.name } });
}

export async function setChannelOverwrite(
  channelId: string,
  input: { targetType: "ROLE" | "MEMBER"; targetId: string; allow: bigint; deny: bigint }
) {
  const existing = await prisma.channelPermissionOverwrite.findUnique({
    where: { channelId_targetType_targetId: { channelId, targetType: input.targetType, targetId: input.targetId } },
  });

  if (existing) {
    return prisma.channelPermissionOverwrite.update({
      where: { id: existing.id },
      data: { allow: input.allow, deny: input.deny },
    });
  }

  return prisma.channelPermissionOverwrite.create({
    data: {
      id: generateSnowflake(),
      channelId,
      targetType: input.targetType,
      targetId: input.targetId,
      allow: input.allow,
      deny: input.deny,
    },
  });
}
