import { z } from "zod";

export const updateProfileSchema = z.object({
  aboutMe: z.string().max(190).optional(),
  customStatus: z.string().max(128).nullable().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["ONLINE", "IDLE", "DND", "INVISIBLE"]),
});

export const lookupUserSchema = z.object({
  username: z.string().min(2).max(32),
  discriminator: z.string().regex(/^\d{4}$/),
});
