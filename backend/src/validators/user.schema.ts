import { z } from "zod";

export const updateProfileSchema = z.object({
  aboutMe: z.string().max(190).optional(),
  customStatus: z.string().max(128).nullable().optional(),
});

// The tag a user has chosen to display next to their name, picked from
// among the servers they're a member of that have a tag configured.
export const updatePrimaryGuildSchema = z.object({
  guildId: z.string().nullable(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["ONLINE", "IDLE", "DND", "INVISIBLE"]),
});

export const lookupUserSchema = z.object({
  username: z.string().min(2).max(32),
  discriminator: z.string().regex(/^\d{4}$/),
});
