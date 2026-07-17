import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import {
  Permissions,
  computeBasePermissions,
  computeChannelPermissions,
  has,
  type PermissionFlag,
} from "../utils/permissions";

export async function getMemberWithRoles(guildId: string, userId: string) {
  return prisma.guildMember.findUnique({
    where: { guildId_userId: { guildId, userId } },
    include: { roles: { include: { role: true } } },
  });
}

export async function getGuildBasePermissions(guildId: string, userId: string): Promise<bigint> {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) throw new AppError(404, "Server not found");
  if (guild.ownerId === userId) return Permissions.ADMINISTRATOR;

  const member = await getMemberWithRoles(guildId, userId);
  if (!member) throw new AppError(403, "You are not a member of this server");

  return computeBasePermissions(member.roles.map((r) => r.role.permissions));
}

export async function getChannelPermissions(channelId: string, userId: string): Promise<bigint> {
  const channel = await prisma.channel.findUnique({ where: { id: channelId }, include: { overwrites: true } });
  if (!channel) throw new AppError(404, "Channel not found");
  if (!channel.guildId) throw new AppError(400, "Not a guild channel");

  const guild = await prisma.guild.findUnique({ where: { id: channel.guildId } });
  if (!guild) throw new AppError(404, "Server not found");
  if (guild.ownerId === userId) return Permissions.ADMINISTRATOR;

  const member = await getMemberWithRoles(channel.guildId, userId);
  if (!member) throw new AppError(403, "You are not a member of this server");

  const everyoneRole = await prisma.role.findFirst({ where: { guildId: channel.guildId, isDefault: true } });
  if (!everyoneRole) throw new AppError(500, "Server is missing its @everyone role");

  const roleIds = member.roles.map((r) => r.roleId);
  const basePermissions = computeBasePermissions([
    everyoneRole.permissions,
    ...member.roles.map((r) => r.role.permissions),
  ]);

  return computeChannelPermissions(
    basePermissions,
    channel.overwrites.map((o) => ({ targetType: o.targetType, targetId: o.targetId, allow: o.allow, deny: o.deny })),
    roleIds,
    everyoneRole.id,
    userId
  );
}

export async function assertGuildPermission(guildId: string, userId: string, flag: PermissionFlag) {
  const permissions = await getGuildBasePermissions(guildId, userId);
  if (!has(permissions, Permissions[flag])) {
    throw new AppError(403, `Missing permission: ${flag}`);
  }
}

export async function assertChannelPermission(channelId: string, userId: string, flag: PermissionFlag) {
  const permissions = await getChannelPermissions(channelId, userId);
  if (!has(permissions, Permissions[flag])) {
    throw new AppError(403, `Missing permission: ${flag}`);
  }
}

/** Compares role hierarchy — used to stop mods from acting on/above equal-or-higher roles. */
export async function assertHigherRole(guildId: string, actorId: string, targetUserId: string) {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (guild?.ownerId === actorId) return; // owner outranks everyone
  if (guild?.ownerId === targetUserId) throw new AppError(403, "Cannot act on the server owner");

  const [actor, target] = await Promise.all([
    getMemberWithRoles(guildId, actorId),
    getMemberWithRoles(guildId, targetUserId),
  ]);
  const actorTop = Math.max(0, ...(actor?.roles.map((r) => r.role.position) ?? [0]));
  const targetTop = Math.max(0, ...(target?.roles.map((r) => r.role.position) ?? [0]));

  if (actorTop <= targetTop) {
    throw new AppError(403, "You cannot act on a member with an equal or higher role");
  }
}
