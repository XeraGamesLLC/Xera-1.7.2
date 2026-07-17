import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import type { AuditAction } from "@prisma/client";

export async function logAudit(params: {
  guildId: string;
  actorId: string;
  action: AuditAction;
  targetId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLogEntry.create({
    data: {
      id: generateSnowflake(),
      guildId: params.guildId,
      actorId: params.actorId,
      action: params.action,
      targetId: params.targetId,
      reason: params.reason,
      metadata: params.metadata as any,
    },
  });
}

export async function listAuditLog(guildId: string, limit = 50) {
  return prisma.auditLogEntry.findMany({
    where: { guildId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    include: { actor: { select: { id: true, username: true, discriminator: true, avatarUrl: true } } },
  });
}
