import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { generateSnowflake } from "../utils/snowflake";
import { hashPassword, verifyPassword, validatePasswordStrength } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { sha256Hex, randomToken } from "../utils/crypto";
import { AppError } from "../middleware/errorHandler";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email.service";
import ms from "../utils/ms";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const REFRESH_TOKEN_TTL_MS = ms("30d");
const RESET_TOKEN_TTL_MS = ms("1h");
const VERIFY_TOKEN_TTL_MS = ms("24h");

async function generateUniqueDiscriminator(username: string): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = String(Math.floor(1 + Math.random() * 9999)).padStart(4, "0");
    const existing = await prisma.user.findUnique({
      where: { username_discriminator: { username, discriminator: candidate } },
    });
    if (!existing) return candidate;
  }
  throw new AppError(409, "This username is extremely popular right now - try another one.");
}

export async function register(input: { username: string; email: string; password: string }, ip: string) {
  const passwordIssue = validatePasswordStrength(input.password);
  if (passwordIssue) throw new AppError(400, passwordIssue);

  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) throw new AppError(409, "An account with that email already exists");

  const discriminator = await generateUniqueDiscriminator(input.username);
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      id: generateSnowflake(),
      username: input.username,
      discriminator,
      email: input.email,
      passwordHash,
      signupIp: ip,
    },
  });

  const verifyToken = randomToken();
  await prisma.emailVerificationToken.create({
    data: {
      id: generateSnowflake(),
      userId: user.id,
      tokenHash: sha256Hex(verifyToken),
      expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });
  await sendVerificationEmail(user.email, verifyToken);

  return sanitizeUser(user);
}

export async function login(input: { email: string; password: string }, ip: string, userAgent?: string) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new AppError(401, "Invalid email or password");

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new AppError(423, `Account temporarily locked. Try again in ${minutesLeft} minute(s).`);
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const locked = attempts >= MAX_LOGIN_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
      },
    });
    throw new AppError(401, "Invalid email or password");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginIp: ip, lastLoginAt: new Date() },
  });

  const tokens = await issueTokenPair(user.id, user.username, ip, userAgent);
  return { user: sanitizeUser(user), ...tokens };
}

export async function issueTokenPair(userId: string, username: string, ip?: string, userAgent?: string) {
  const accessToken = signAccessToken({ sub: userId, username });

  const refreshTokenId = generateSnowflake();
  const refreshToken = signRefreshToken({ sub: userId, jti: refreshTokenId });

  await prisma.refreshToken.create({
    data: {
      id: refreshTokenId,
      userId,
      tokenHash: sha256Hex(refreshToken),
      ip,
      userAgent,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { accessToken, refreshToken };
}

export async function refreshTokens(rawRefreshToken: string, ip?: string, userAgent?: string) {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, "Refresh token expired");
  }

  if (stored.revoked || stored.tokenHash !== sha256Hex(rawRefreshToken)) {
    // Reuse of an already-rotated/revoked token is a strong signal of theft —
    // nuke every session for this user rather than trusting it.
    await prisma.refreshToken.updateMany({ where: { userId: stored.userId }, data: { revoked: true } });
    throw new AppError(401, "Refresh token reuse detected - all sessions revoked, please log in again");
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) throw new AppError(401, "User no longer exists");

  return issueTokenPair(user.id, user.username, ip, userAgent);
}

export async function logout(rawRefreshToken: string | undefined) {
  if (!rawRefreshToken) return;
  try {
    const payload = verifyRefreshToken(rawRefreshToken);
    await prisma.refreshToken.update({ where: { id: payload.jti }, data: { revoked: true } }).catch(() => undefined);
  } catch {
    // token already invalid — nothing to revoke
  }
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always behave the same whether the account exists or not, so this
  // endpoint can't be used to enumerate registered emails.
  if (!user) return;

  const token = randomToken();
  await prisma.passwordResetToken.create({
    data: {
      id: generateSnowflake(),
      userId: user.id,
      tokenHash: sha256Hex(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });
  await sendPasswordResetEmail(user.email, token);
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const passwordIssue = validatePasswordStrength(newPassword);
  if (passwordIssue) throw new AppError(400, passwordIssue);

  const tokenHash = sha256Hex(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.used || record.expiresAt < new Date()) {
    throw new AppError(400, "Invalid or expired reset token");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revoked: true } }),
  ]);
}

export async function verifyEmail(rawToken: string) {
  const tokenHash = sha256Hex(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.expiresAt < new Date()) {
    throw new AppError(400, "Invalid or expired verification token");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);
}

export function sanitizeUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// Cache a lightweight "is this refresh token revoked" flag in Redis so a
// stolen-but-revoked token is rejected even faster than a DB round trip
// would allow, under sustained abuse. Best-effort — DB remains source of truth.
export async function markTokenRevokedCache(tokenId: string) {
  await redis.set(`revoked:${tokenId}`, "1", "EX", 60 * 60 * 24 * 30);
}
