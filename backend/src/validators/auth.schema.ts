import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores, and periods"),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  password: z.string().min(8).max(128),
  agreedToTos: z.literal(true, { errorMap: () => ({ message: "You must agree to the Terms of Service" }) }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
