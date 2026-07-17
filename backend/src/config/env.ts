import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // HMAC signing key for auth tokens (see utils/token.ts) — kept the JWT_*
  // name for backwards-compatible .env files even though tokens aren't JWTs.
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be set to a long random value"),

  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_AVATAR_SIZE_MB: z.coerce.number().default(8),
  MAX_ATTACHMENT_SIZE_MB: z.coerce.number().default(100),

  ANTI_VPN_ENABLED: z.coerce.boolean().default(false),
  ANTI_VPN_API_KEY: z.string().optional().default(""),

  // Optional: an invite code for a server every account should belong to
  // (e.g. the official/support server). Applied on register for new
  // accounts, and re-checked on login so existing accounts created before
  // this was set (or before they existed) get caught up too. Membership is
  // just a normal join - anyone can still leave freely.
  AUTO_JOIN_GUILD_INVITE_CODE: z.string().optional().default(""),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud — a misconfigured secret in prod is worse than a crash on boot.
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(",").map((origin) => origin.trim());
