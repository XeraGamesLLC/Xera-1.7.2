import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import { AppError } from "../middleware/errorHandler";
import { isSuperAdminIdentity } from "../utils/superAdmin";

export async function isIpBanned(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  const ban = await prisma.ipBan.findUnique({ where: { ipAddress: ip } });
  return !!ban;
}

/**
 * Bans every known IP address on file for a user (signup + last login) and
 * bumps their tokenVersion so any currently-issued token stops working
 * immediately, instead of waiting for it to naturally expire.
 */
export async function banUserByIp(actorId: string, targetUserId: string, reason: string | undefined, actorIp: string) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, discriminator: true, signupIp: true, lastLoginIp: true },
  });
  if (!target) throw new AppError(404, "User not found");
  if (isSuperAdminIdentity(target)) throw new AppError(400, "Cannot ban the platform super admin");

  const ips = [...new Set([target.signupIp, target.lastLoginIp].filter((ip): ip is string => !!ip && ip !== "unknown"))];
  if (ips.length === 0) throw new AppError(400, "This user has no known IP address on file to ban");
  if (ips.includes(actorIp)) {
    throw new AppError(400, "Refusing to ban an IP address that matches your own current connection");
  }

  await prisma.$transaction([
    ...ips.map((ipAddress) =>
      prisma.ipBan.upsert({
        where: { ipAddress },
        create: { id: generateSnowflake(), ipAddress, reason, bannedBy: actorId },
        update: { reason, bannedBy: actorId },
      })
    ),
    prisma.user.update({ where: { id: targetUserId }, data: { tokenVersion: { increment: 1 } } }),
  ]);

  return ips;
}

export async function banIpAddress(actorId: string, ipAddress: string, reason: string | undefined, actorIp: string) {
  if (ipAddress === actorIp) {
    throw new AppError(400, "Refusing to ban an IP address that matches your own current connection");
  }
  return prisma.ipBan.upsert({
    where: { ipAddress },
    create: { id: generateSnowflake(), ipAddress, reason, bannedBy: actorId },
    update: { reason, bannedBy: actorId },
  });
}

export async function listIpBans() {
  return prisma.ipBan.findMany({ orderBy: { createdAt: "desc" } });
}

export async function unbanIp(id: string) {
  await prisma.ipBan.delete({ where: { id } }).catch(() => undefined);
}
