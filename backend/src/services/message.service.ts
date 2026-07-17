import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import { AppError } from "../middleware/errorHandler";
import { parseMentions } from "../utils/mentions";
import { logAudit } from "./auditLog.service";

const MESSAGE_INCLUDE = {
  author: { select: { id: true, username: true, discriminator: true, avatarUrl: true } },
  attachments: true,
  reactions: true,
  embeds: true,
  replyTo: {
    include: { author: { select: { id: true, username: true, discriminator: true, avatarUrl: true } } },
  },
} as const;

export async function createMessage(input: {
  channelId: string;
  authorId: string;
  content: string;
  replyToId?: string | null;
  attachmentIds?: string[];
}) {
  const id = generateSnowflake();

  // Prisma's `connect` just reassigns the attachment's messageId FK — with
  // no ownership check, a client could pass any attachment id (attachment
  // ids are sequential snowflakes, not random, so nearby ones are guessable)
  // and silently steal someone else's upload into their own message, moving
  // it out of wherever (possibly a private DM) it was originally attached.
  // Only allow attaching files the sender uploaded themselves and that
  // aren't already attached to another message.
  let attachmentIds = input.attachmentIds ?? [];
  if (attachmentIds.length) {
    const owned = await prisma.attachment.findMany({
      where: { id: { in: attachmentIds }, uploaderId: input.authorId, messageId: null },
      select: { id: true },
    });
    attachmentIds = owned.map((a) => a.id);
  }

  const message = await prisma.message.create({
    data: {
      id,
      channelId: input.channelId,
      authorId: input.authorId,
      content: input.content,
      replyToId: input.replyToId ?? null,
      attachments: attachmentIds.length ? { connect: attachmentIds.map((attachmentId) => ({ id: attachmentId })) } : undefined,
    },
    include: MESSAGE_INCLUDE,
  });

  return { message, mentions: parseMentions(input.content) };
}

export async function listMessages(channelId: string, opts: { before?: string; limit?: number }) {
  const limit = Math.min(opts.limit ?? 50, 100);

  return prisma.message.findMany({
    where: { channelId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(opts.before ? { cursor: { id: opts.before }, skip: 1 } : {}),
    include: MESSAGE_INCLUDE,
  });
}

export async function addEmbed(messageId: string, embed: { url: string; title: string | null; description: string | null; imageUrl: string | null; siteName: string | null }) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.deletedAt) return null; // message was deleted before the embed finished resolving

  await prisma.messageEmbed.create({
    data: { id: generateSnowflake(), messageId, ...embed },
  });

  return prisma.message.findUnique({ where: { id: messageId }, include: MESSAGE_INCLUDE });
}

export async function editMessage(messageId: string, authorId: string, content: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.deletedAt) throw new AppError(404, "Message not found");
  if (message.authorId !== authorId) throw new AppError(403, "You can only edit your own messages");

  return prisma.message.update({
    where: { id: messageId },
    data: { content, editedAt: new Date() },
    include: MESSAGE_INCLUDE,
  });
}

export async function deleteMessage(messageId: string, actorId: string, guildId?: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.deletedAt) throw new AppError(404, "Message not found");

  await prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date(), content: "" } });

  if (guildId && message.authorId !== actorId) {
    await logAudit({ guildId, actorId, action: "MESSAGE_DELETE", targetId: message.authorId, metadata: { messageId } });
  }

  return message;
}

export async function setPinned(messageId: string, pinned: boolean) {
  return prisma.message.update({ where: { id: messageId }, data: { pinned }, include: MESSAGE_INCLUDE });
}

export async function listPinned(channelId: string) {
  return prisma.message.findMany({
    where: { channelId, pinned: true, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: MESSAGE_INCLUDE,
  });
}

export async function searchMessages(channelId: string, query: string) {
  return prisma.message.findMany({
    where: { channelId, deletedAt: null, content: { contains: query, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: MESSAGE_INCLUDE,
  });
}

export async function addReaction(messageId: string, userId: string, emoji: string) {
  const id = generateSnowflake();
  return prisma.reaction.upsert({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
    create: { id, messageId, userId, emoji },
    update: {},
  });
}

export async function removeReaction(messageId: string, userId: string, emoji: string) {
  await prisma.reaction.deleteMany({ where: { messageId, userId, emoji } });
}

export function serializeMessage(message: any) {
  return {
    ...message,
    replyTo: message.replyTo ?? null,
  };
}
