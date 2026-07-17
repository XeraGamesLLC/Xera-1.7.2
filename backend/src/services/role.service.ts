import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "./auditLog.service";

export async function createRole(guildId: string, actorId: string, name: string) {
  const maxPosition = await prisma.role.aggregate({ where: { guildId }, _max: { position: true } });
  const role = await prisma.role.create({
    data: {
      id: generateSnowflake(),
      guildId,
      name,
      position: (maxPosition._max.position ?? 0) + 1,
      permissions: 0n,
    },
  });
  await logAudit({ guildId, actorId, action: "ROLE_CREATE", targetId: role.id, metadata: { name } });
  return role;
}

export async function updateRole(
  roleId: string,
  guildId: string,
  actorId: string,
  data: Partial<{ name: string; color: number; permissions: bigint; hoist: boolean; mentionable: boolean; position: number }>
) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || role.guildId !== guildId) throw new AppError(404, "Role not found");
  if (role.isDefault && (data.name || data.position !== undefined)) {
    throw new AppError(400, "Cannot rename or reposition @everyone");
  }

  const updated = await prisma.role.update({ where: { id: roleId }, data });
  await logAudit({ guildId, actorId, action: "ROLE_UPDATE", targetId: roleId });
  return updated;
}

export async function deleteRole(roleId: string, guildId: string, actorId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || role.guildId !== guildId) throw new AppError(404, "Role not found");
  if (role.isDefault) throw new AppError(400, "Cannot delete @everyone");

  await prisma.role.delete({ where: { id: roleId } });
  await logAudit({ guildId, actorId, action: "ROLE_DELETE", targetId: roleId, metadata: { name: role.name } });
}

export async function assignRole(guildId: string, actorId: string, memberUserId: string, roleId: string) {
  const [member, role] = await Promise.all([
    prisma.guildMember.findUnique({ where: { guildId_userId: { guildId, userId: memberUserId } } }),
    prisma.role.findUnique({ where: { id: roleId } }),
  ]);
  if (!member) throw new AppError(404, "Member not found");
  if (!role || role.guildId !== guildId) throw new AppError(404, "Role not found");

  await prisma.guildMemberRole.upsert({
    where: { guildMemberId_roleId: { guildMemberId: member.id, roleId } },
    create: { guildMemberId: member.id, roleId },
    update: {},
  });
  await logAudit({ guildId, actorId, action: "MEMBER_ROLE_UPDATE", targetId: memberUserId, metadata: { added: roleId } });
}

export async function removeRole(guildId: string, actorId: string, memberUserId: string, roleId: string) {
  const member = await prisma.guildMember.findUnique({ where: { guildId_userId: { guildId, userId: memberUserId } } });
  if (!member) throw new AppError(404, "Member not found");

  await prisma.guildMemberRole.deleteMany({ where: { guildMemberId: member.id, roleId } });
  await logAudit({ guildId, actorId, action: "MEMBER_ROLE_UPDATE", targetId: memberUserId, metadata: { removed: roleId } });
}
