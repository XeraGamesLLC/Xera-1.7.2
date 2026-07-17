import { z } from "zod";

export const createGuildSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export const updateGuildSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const createChannelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-_]+$/i, "Channel names should not contain spaces or special characters"),
  type: z.enum(["TEXT", "VOICE"]).default("TEXT"),
  categoryId: z.string().nullable().optional(),
  topic: z.string().max(1024).nullable().optional(),
});

export const updateChannelSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  topic: z.string().max(1024).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
  slowmodeSeconds: z.number().int().min(0).max(21600).optional(),
  isNsfw: z.boolean().optional(),
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(100).default("new role"),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  color: z.number().int().min(0).max(0xffffff).optional(),
  permissions: z.string().regex(/^\d+$/).optional(), // stringified BigInt
  hoist: z.boolean().optional(),
  mentionable: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const createInviteSchema = z.object({
  channelId: z.string().min(1),
  maxUses: z.number().int().min(0).max(1000).nullable().optional(),
  expiresInSeconds: z.number().int().min(0).max(60 * 60 * 24 * 30).nullable().optional(),
});

export const overwriteSchema = z.object({
  targetType: z.enum(["ROLE", "MEMBER"]),
  targetId: z.string().min(1),
  allow: z.string().regex(/^\d+$/).default("0"),
  deny: z.string().regex(/^\d+$/).default("0"),
});
