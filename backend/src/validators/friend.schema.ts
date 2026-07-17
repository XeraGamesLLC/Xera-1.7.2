import { z } from "zod";

export const sendFriendRequestSchema = z.object({
  username: z.string().min(2).max(32),
  discriminator: z.string().regex(/^\d{4}$/),
});

export const createGroupDmSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1).max(9), // + creator = old Discord's 10-person group DM cap
  name: z.string().max(100).nullable().optional(),
});
