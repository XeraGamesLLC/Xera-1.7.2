import type { Socket } from "socket.io";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";
import { consumeRateLimit } from "../../middleware/rateLimit";
import { emitToChannel, emitToUser } from "../index";
import * as messageService from "../../services/message.service";
import { assertChannelPermission } from "../../services/permission.service";
import { resolveEmbedForUrl, firstUrlIn } from "../../services/embed.service";
import {
  sendMessageSchema,
  editMessageSchema,
  deleteMessageSchema,
  reactionSchema,
  typingSchema,
} from "../../validators/message.schema";

type Ack = (response: { ok: true; data?: unknown } | { ok: false; error: string }) => void;

async function getChannelContext(channelId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  return channel;
}

async function assertCanSend(channelId: string, userId: string) {
  const channel = await getChannelContext(channelId);
  if (!channel) throw new Error("Channel not found");

  if (channel.guildId) {
    const member = await prisma.guildMember.findUnique({
      where: { guildId_userId: { guildId: channel.guildId, userId } },
    });
    if (member?.isTimedOut && member.timeoutUntil && member.timeoutUntil > new Date()) {
      throw new Error("You are timed out in this server");
    }

    await assertChannelPermission(channelId, userId, "SEND_MESSAGES");

    if (channel.slowmodeSeconds > 0) {
      const key = `slowmode:${channelId}:${userId}`;
      const remaining = await redis.ttl(key);
      if (remaining > 0) throw new Error(`Slow mode is active - wait ${remaining}s`);
      await redis.set(key, "1", "EX", channel.slowmodeSeconds);
    }
  } else {
    const membership = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!membership) throw new Error("You are not part of this conversation");
  }

  return channel;
}

export function registerMessageHandlers(socket: Socket) {
  const userId: string = socket.data.userId;

  socket.on("message:send", async (raw: unknown, ack?: Ack) => {
    try {
      const input = sendMessageSchema.parse(raw);

      const withinBudget = await consumeRateLimit(`msg:${userId}`, 10, 10);
      if (!withinBudget) throw new Error("You're sending messages too fast");

      const channel = await assertCanSend(input.channelId, userId);

      const { message, mentions } = await messageService.createMessage({
        channelId: input.channelId,
        authorId: userId,
        content: input.content,
        replyToId: input.replyToId,
        attachmentIds: input.attachmentIds,
      });

      emitToChannel(input.channelId, "message:create", message);

      await prisma.readState.upsert({
        where: { userId_channelId: { userId, channelId: input.channelId } },
        create: { userId, channelId: input.channelId, lastReadMessageId: message.id },
        update: { lastReadMessageId: message.id },
      });

      await deliverMentions(channel, input.channelId, userId, mentions, message.id);

      ack?.({ ok: true, data: message });

      // Best-effort, fire-and-forget: resolve a link embed and push it out as
      // a message:update once ready, matching Discord's "embed pops in a
      // moment later" behavior. Never let this affect the send itself.
      void generateEmbedForMessage(message.id, input.channelId, userId, input.content);
    } catch (err: any) {
      ack?.({ ok: false, error: err.message ?? "Failed to send message" });
    }
  });

  socket.on("message:edit", async (raw: unknown, ack?: Ack) => {
    try {
      const input = editMessageSchema.parse(raw);
      const message = await messageService.editMessage(input.messageId, userId, input.content);
      emitToChannel(message.channelId, "message:update", message);
      ack?.({ ok: true, data: message });
    } catch (err: any) {
      ack?.({ ok: false, error: err.message ?? "Failed to edit message" });
    }
  });

  socket.on("message:delete", async (raw: unknown, ack?: Ack) => {
    try {
      const input = deleteMessageSchema.parse(raw);
      const existing = await prisma.message.findUnique({ where: { id: input.messageId } });
      if (!existing) throw new Error("Message not found");

      const channel = await getChannelContext(existing.channelId);
      if (existing.authorId !== userId) {
        if (!channel?.guildId) throw new Error("You can only delete your own messages");
        await assertChannelPermission(existing.channelId, userId, "MANAGE_MESSAGES");
      }

      await messageService.deleteMessage(input.messageId, userId, channel?.guildId ?? undefined);
      emitToChannel(existing.channelId, "message:delete", { id: input.messageId, channelId: existing.channelId });
      ack?.({ ok: true });
    } catch (err: any) {
      ack?.({ ok: false, error: err.message ?? "Failed to delete message" });
    }
  });

  socket.on("message:pin", async (raw: unknown, ack?: Ack) => {
    try {
      const input = deleteMessageSchema.parse(raw); // just { messageId }
      const existing = await prisma.message.findUnique({ where: { id: input.messageId } });
      if (!existing) throw new Error("Message not found");
      const channel = await getChannelContext(existing.channelId);
      if (channel?.guildId) await assertChannelPermission(existing.channelId, userId, "MANAGE_MESSAGES");

      const message = await messageService.setPinned(input.messageId, true);
      emitToChannel(existing.channelId, "message:update", message);
      ack?.({ ok: true, data: message });
    } catch (err: any) {
      ack?.({ ok: false, error: err.message ?? "Failed to pin message" });
    }
  });

  socket.on("reaction:add", async (raw: unknown, ack?: Ack) => {
    try {
      const input = reactionSchema.parse(raw);
      const message = await prisma.message.findUnique({ where: { id: input.messageId } });
      if (!message) throw new Error("Message not found");
      const channel = await getChannelContext(message.channelId);
      if (channel?.guildId) await assertChannelPermission(message.channelId, userId, "ADD_REACTIONS");

      const reaction = await messageService.addReaction(input.messageId, userId, input.emoji);
      emitToChannel(message.channelId, "reaction:add", { messageId: input.messageId, userId, emoji: input.emoji, id: reaction.id });
      ack?.({ ok: true });
    } catch (err: any) {
      ack?.({ ok: false, error: err.message ?? "Failed to add reaction" });
    }
  });

  socket.on("reaction:remove", async (raw: unknown, ack?: Ack) => {
    try {
      const input = reactionSchema.parse(raw);
      const message = await prisma.message.findUnique({ where: { id: input.messageId } });
      if (!message) throw new Error("Message not found");

      await messageService.removeReaction(input.messageId, userId, input.emoji);
      emitToChannel(message.channelId, "reaction:remove", { messageId: input.messageId, userId, emoji: input.emoji });
      ack?.({ ok: true });
    } catch (err: any) {
      ack?.({ ok: false, error: err.message ?? "Failed to remove reaction" });
    }
  });

  socket.on("typing:start", async (raw: unknown) => {
    try {
      const input = typingSchema.parse(raw);
      const withinBudget = await consumeRateLimit(`typing:${userId}:${input.channelId}`, 1, 3);
      if (!withinBudget) return;
      socket.to(`channel:${input.channelId}`).emit("typing:start", { channelId: input.channelId, userId });
    } catch {
      // typing indicators are best-effort, swallow errors
    }
  });
}

async function generateEmbedForMessage(messageId: string, channelId: string, userId: string, content: string) {
  try {
    const url = firstUrlIn(content);
    if (!url) return;

    const withinBudget = await consumeRateLimit(`embed:${userId}`, 10, 60);
    if (!withinBudget) return;

    const embed = await resolveEmbedForUrl(url);
    if (!embed) return;

    const updated = await messageService.addEmbed(messageId, embed);
    if (!updated) return;

    emitToChannel(channelId, "message:update", updated);
  } catch {
    // Link previews are a nicety, not core functionality — swallow errors.
  }
}

async function deliverMentions(
  channel: { id: string; guildId: string | null },
  channelId: string,
  authorId: string,
  mentions: { userIds: string[]; roleIds: string[]; everyone: boolean; here: boolean },
  messageId: string
) {
  const targetUserIds = new Set<string>(mentions.userIds.filter((id) => id !== authorId));

  if (channel.guildId && (mentions.everyone || mentions.here)) {
    try {
      await assertChannelPermission(channelId, authorId, "MENTION_EVERYONE");
      const members = await prisma.guildMember.findMany({ where: { guildId: channel.guildId }, select: { userId: true } });
      for (const m of members) if (m.userId !== authorId) targetUserIds.add(m.userId);
    } catch {
      // author lacks MENTION_EVERYONE — @everyone/@here in the text is just inert text, no mass notification
    }
  }

  if (channel.guildId && mentions.roleIds.length) {
    const roleMembers = await prisma.guildMemberRole.findMany({
      where: { roleId: { in: mentions.roleIds } },
      include: { guildMember: true },
    });
    for (const rm of roleMembers) if (rm.guildMember.userId !== authorId) targetUserIds.add(rm.guildMember.userId);
  }

  for (const uid of targetUserIds) {
    await prisma.readState
      .upsert({
        where: { userId_channelId: { userId: uid, channelId } },
        create: { userId: uid, channelId, mentionCount: 1 },
        update: { mentionCount: { increment: 1 } },
      })
      .catch(() => undefined);
    emitToUser(uid, "notification:mention", { channelId, messageId });
  }
}
