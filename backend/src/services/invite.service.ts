import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "./auditLog.service";

export async function createInvite(
  guildId: string,
  channelId: string,
  createdBy: string,
  opts: { maxUses?: number | null; expiresInSeconds?: number | null }
) {
  const invite = await prisma.invite.create({
    data: {
      code: nanoid(10),
      guildId,
      channelId,
      createdBy,
      maxUses: opts.maxUses ?? null,
      expiresAt: opts.expiresInSeconds ? new Date(Date.now() + opts.expiresInSeconds * 1000) : null,
    },
  });
  await logAudit({ guildId, actorId: createdBy, action: "INVITE_CREATE", targetId: invite.code });
  return invite;
}

export async function resolveAndUseInvite(code: string, userId: string) {
  const invite = await prisma.invite.findUnique({ where: { code } });
  if (!invite) throw new AppError(404, "Invite not found or expired");
  if (invite.expiresAt && invite.expiresAt < new Date()) throw new AppError(410, "Invite has expired");
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) throw new AppError(410, "Invite has reached its max uses");

  const banned = await prisma.ban.findUnique({ where: { guildId_userId: { guildId: invite.guildId, userId } } });
  if (banned) throw new AppError(403, "You are banned from this server");

  const existingMember = await prisma.guildMember.findUnique({
    where: { guildId_userId: { guildId: invite.guildId, userId } },
  });
  if (existingMember) {
    const guild = await prisma.guild.findUnique({ where: { id: invite.guildId } });
    return guild;
  }

  const guild = await prisma.$transaction(async (tx) => {
    await tx.guildMember.create({ data: { id: generateSnowflake(), guildId: invite.guildId, userId } });
    await tx.invite.update({ where: { code }, data: { uses: { increment: 1 } } });
    return tx.guild.findUnique({ where: { id: invite.guildId } });
  });

  return guild;
}

export async function listGuildInvites(guildId: string) {
  return prisma.invite.findMany({
    where: { guildId },
    orderBy: { createdAt: "desc" },
    include: { creator: { select: { id: true, username: true, discriminator: true } }, channel: { select: { name: true } } },
  });
}

export async function deleteInvite(code: string, guildId: string, actorId: string) {
  const invite = await prisma.invite.findUnique({ where: { code } });
  if (!invite || invite.guildId !== guildId) throw new AppError(404, "Invite not found");
  await prisma.invite.delete({ where: { code } });
  await logAudit({ guildId, actorId, action: "INVITE_DELETE", targetId: code });
}
