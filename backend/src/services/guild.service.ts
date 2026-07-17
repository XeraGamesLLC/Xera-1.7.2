import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import { AppError } from "../middleware/errorHandler";
import { DEFAULT_EVERYONE_PERMISSIONS } from "../utils/permissions";

export async function createGuild(ownerId: string, name: string) {
  const guildId = generateSnowflake();

  return prisma.$transaction(async (tx) => {
    const guild = await tx.guild.create({ data: { id: guildId, name, ownerId } });

    const everyoneRole = await tx.role.create({
      data: {
        id: generateSnowflake(),
        guildId,
        name: "@everyone",
        isDefault: true,
        position: 0,
        permissions: DEFAULT_EVERYONE_PERMISSIONS,
      },
    });

    await tx.guildMember.create({
      data: { id: generateSnowflake(), guildId, userId: ownerId },
    });

    const generalCategory = await tx.category.create({
      data: { id: generateSnowflake(), guildId, name: "Text Channels", position: 0 },
    });

    const generalChannel = await tx.channel.create({
      data: {
        id: generateSnowflake(),
        guildId,
        categoryId: generalCategory.id,
        name: "general",
        type: "TEXT",
        position: 0,
      },
    });

    return { guild, everyoneRole, generalChannel };
  });
}

export async function listUserGuilds(userId: string) {
  const memberships = await prisma.guildMember.findMany({
    where: { userId },
    include: { guild: true },
  });
  return memberships.map((m) => m.guild);
}

export async function getGuildDetail(guildId: string, userId: string) {
  const membership = await prisma.guildMember.findUnique({ where: { guildId_userId: { guildId, userId } } });
  if (!membership) throw new AppError(403, "You are not a member of this server");

  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: {
      categories: { orderBy: { position: "asc" }, include: { channels: { orderBy: { position: "asc" } } } },
      channels: { where: { categoryId: null }, orderBy: { position: "asc" } },
      roles: { orderBy: { position: "desc" } },
    },
  });
  if (!guild) throw new AppError(404, "Server not found");
  return guild;
}

export async function listMembers(guildId: string, userId: string) {
  const membership = await prisma.guildMember.findUnique({ where: { guildId_userId: { guildId, userId } } });
  if (!membership) throw new AppError(403, "You are not a member of this server");

  return prisma.guildMember.findMany({
    where: { guildId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          discriminator: true,
          avatarUrl: true,
          status: true,
          customStatus: true,
        },
      },
      roles: { include: { role: true } },
    },
  });
}

export async function leaveGuild(guildId: string, userId: string) {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) throw new AppError(404, "Server not found");
  if (guild.ownerId === userId) {
    throw new AppError(400, "The owner cannot leave — transfer ownership or delete the server instead");
  }
  await prisma.guildMember.delete({ where: { guildId_userId: { guildId, userId } } }).catch(() => {
    throw new AppError(404, "You are not a member of this server");
  });
}

export async function deleteGuild(guildId: string, userId: string) {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  if (!guild) throw new AppError(404, "Server not found");
  if (guild.ownerId !== userId) throw new AppError(403, "Only the owner can delete this server");
  await prisma.guild.delete({ where: { id: guildId } });
}

export async function updateGuild(guildId: string, data: { name?: string }) {
  return prisma.guild.update({ where: { id: guildId }, data });
}
