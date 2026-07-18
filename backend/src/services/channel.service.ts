import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "./auditLog.service";
import { Permissions } from "../utils/permissions";
import type { ChannelPurpose } from "@prisma/client";

export async function createCategory(guildId: string, name: string) {
  const count = await prisma.category.count({ where: { guildId } });
  return prisma.category.create({ data: { id: generateSnowflake(), guildId, name, position: count } });
}

/**
 * Keeps the @everyone channel overwrite in sync with a channel's purpose:
 * ANNOUNCEMENT/RULES deny SEND_MESSAGES to @everyone (admins/owner bypass
 * overwrites entirely, see computeChannelPermissions), NORMAL clears that
 * bit again. Only ever touches the SEND_MESSAGES bit of this one overwrite
 * row, so it never clobbers other overwrite bits a future "advanced
 * permissions" UI might set.
 */
async function applyPurposeOverwrite(channelId: string, guildId: string, purpose: ChannelPurpose) {
  const everyoneRole = await prisma.role.findFirst({ where: { guildId, isDefault: true } });
  if (!everyoneRole) return;

  const existing = await prisma.channelPermissionOverwrite.findUnique({
    where: { channelId_targetType_targetId: { channelId, targetType: "ROLE", targetId: everyoneRole.id } },
  });

  if (purpose === "NORMAL") {
    if (!existing) return;
    const deny = existing.deny & ~Permissions.SEND_MESSAGES;
    if (deny === 0n && existing.allow === 0n) {
      await prisma.channelPermissionOverwrite.delete({ where: { id: existing.id } });
    } else {
      await prisma.channelPermissionOverwrite.update({ where: { id: existing.id }, data: { deny } });
    }
    return;
  }

  if (existing) {
    await prisma.channelPermissionOverwrite.update({
      where: { id: existing.id },
      data: { deny: existing.deny | Permissions.SEND_MESSAGES },
    });
  } else {
    await prisma.channelPermissionOverwrite.create({
      data: {
        id: generateSnowflake(),
        channelId,
        targetType: "ROLE",
        targetId: everyoneRole.id,
        allow: 0n,
        deny: Permissions.SEND_MESSAGES,
      },
    });
  }
}

export async function createChannel(
  guildId: string,
  actorId: string,
  input: { name: string; type: "TEXT" | "VOICE"; purpose?: ChannelPurpose; categoryId?: string | null; topic?: string | null }
) {
  const count = await prisma.channel.count({ where: { guildId } });
  const purpose = input.purpose ?? "NORMAL";
  const channel = await prisma.channel.create({
    data: {
      id: generateSnowflake(),
      guildId,
      name: input.name.toLowerCase(),
      type: input.type,
      purpose,
      categoryId: input.categoryId ?? null,
      topic: input.topic ?? null,
      position: count,
    },
  });
  if (purpose !== "NORMAL") await applyPurposeOverwrite(channel.id, guildId, purpose);
  await logAudit({ guildId, actorId, action: "CHANNEL_CREATE", targetId: channel.id });
  return channel;
}

export async function updateChannel(
  channelId: string,
  guildId: string,
  actorId: string,
  data: Partial<{
    name: string;
    topic: string | null;
    purpose: ChannelPurpose;
    categoryId: string | null;
    position: number;
    slowmodeSeconds: number;
    isNsfw: boolean;
  }>
) {
  const channel = await prisma.channel.update({ where: { id: channelId }, data });
  if (data.purpose !== undefined) await applyPurposeOverwrite(channelId, guildId, data.purpose);
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
