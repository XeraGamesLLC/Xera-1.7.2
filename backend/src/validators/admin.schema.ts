import { z } from "zod";

// Exactly one of userId (ban every known IP on file for that account) or a
// raw ipAddress (ban an address that isn't necessarily tied to an account
// you know of) must be given.
export const ipBanSchema = z
  .object({
    userId: z.string().min(1).optional(),
    ipAddress: z
      .string()
      .trim()
      .min(3)
      .max(45)
      .regex(/^[0-9a-fA-F:.]+$/, "Not a valid IP address")
      .optional(),
    reason: z.string().trim().max(512).optional(),
  })
  .refine((d) => Boolean(d.userId) !== Boolean(d.ipAddress), {
    message: "Provide exactly one of userId or ipAddress",
  });
