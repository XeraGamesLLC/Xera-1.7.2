import { z } from "zod";

export const sendMessageSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().min(1).max(4000),
  replyToId: z.string().min(1).nullable().optional(),
  attachmentIds: z.array(z.string()).max(10).optional(),
});

export const editMessageSchema = z.object({
  messageId: z.string().min(1),
  content: z.string().min(1).max(4000),
});

export const deleteMessageSchema = z.object({
  messageId: z.string().min(1),
});

export const reactionSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(64),
});

export const typingSchema = z.object({
  channelId: z.string().min(1),
});
