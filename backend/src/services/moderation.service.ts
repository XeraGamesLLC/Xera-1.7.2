import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import { AppError } from "../middleware/errorHandler";
import { assertGuildPermission, assertHigherRole } from "./permission.service";
import { logAudit } from "./auditLog.service";

export async function kickMember(guildId: string, actorId: string, targetUserId: string, reason?: string) {
  await assertGuildPermission(guildId, actorId, "KICK_MEMBERS");
  await assertHigherRole(guildId, actorId, targetUserId);

  await prisma.guildMember.delete({ where: { guildId_userId: { guildId, userId: targetUserId } } }).catch(() => {
    throw new AppError(404, "Member not found");
  });
  await logAudit({ guildId, actorId, action: "MEMBER_KICK", targetId: targetUserId, reason });
}

export async function banMember(guildId: string, actorId: string, targetUserId: string, reason?: string) {
  await assertGuildPermission(guildId, actorId, "BAN_MEMBERS");
  await assertHigherRole(guildId, actorId, targetUserId);

  await prisma.$transaction([
    prisma.ban.upsert({
      where: { guildId_userId: { guildId, userId: targetUserId } },
      create: { id: generateSnowflake(), guildId, userId: targetUserId, bannedBy: actorId, reason },
      update: { reason, bannedBy: actorId },
    }),
    prisma.guildMember.deleteMany({ where: { guildId, userId: targetUserId } }),
  ]);
  await logAudit({ guildId, actorId, action: "MEMBER_BAN", targetId: targetUserId, reason });
}

export async function unbanMember(guildId: string, actorId: string, targetUserId: string) {
  await assertGuildPermission(guildId, actorId, "BAN_MEMBERS");
  await prisma.ban.delete({ where: { guildId_userId: { guildId, userId: targetUserId } } }).catch(() => {
    throw new AppError(404, "Ban not found");
  });
  await logAudit({ guildId, actorId, action: "MEMBER_UNBAN", targetId: targetUserId });
}

export async function listBans(guildId: string, actorId: string) {
  await assertGuildPermission(guildId, actorId, "BAN_MEMBERS");
  return prisma.ban.findMany({
    where: { guildId },
    include: { user: { select: { id: true, username: true, discriminator: true, avatarUrl: true } } },
  });
}

export async function timeoutMember(guildId: string, actorId: string, targetUserId: string, minutes: number, reason?: string) {
  await assertGuildPermission(guildId, actorId, "MODERATE_MEMBERS");
  await assertHigherRole(guildId, actorId, targetUserId);

  const until = new Date(Date.now() + minutes * 60_000);
  await prisma.guildMember.update({
    where: { guildId_userId: { guildId, userId: targetUserId } },
    data: { isTimedOut: true, timeoutUntil: until },
  });
  await logAudit({ guildId, actorId, action: "MEMBER_TIMEOUT", targetId: targetUserId, reason, metadata: { until } });
  return until;
}

export async function removeTimeout(guildId: string, actorId: string, targetUserId: string) {
  await assertGuildPermission(guildId, actorId, "MODERATE_MEMBERS");
  await prisma.guildMember.update({
    where: { guildId_userId: { guildId, userId: targetUserId } },
    data: { isTimedOut: false, timeoutUntil: null },
  });
  await logAudit({ guildId, actorId, action: "MEMBER_TIMEOUT", targetId: targetUserId, metadata: { removed: true } });
}

export async function setNickname(guildId: string, actorId: string, targetUserId: string, nickname: string | null) {
  if (actorId !== targetUserId) {
    await assertGuildPermission(guildId, actorId, "MANAGE_NICKNAMES");
  }
  const member = await prisma.guildMember.update({
    where: { guildId_userId: { guildId, userId: targetUserId } },
    data: { nickname },
  });
  await logAudit({ guildId, actorId, action: "MEMBER_NICK_UPDATE", targetId: targetUserId });
  return member;
}
