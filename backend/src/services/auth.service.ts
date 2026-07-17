import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import { hashPassword, verifyPassword, validatePasswordStrength } from "../utils/password";
import { issueToken, decodeToken } from "../utils/token";
import { sha256Hex, randomToken } from "../utils/crypto";
import { AppError } from "../middleware/errorHandler";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email.service";
import ms from "../utils/ms";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
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

export async function login(input: { email: string; password: string }, ip: string) {
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

  // Same token every time you log in (until it's invalidated) — logging in
  // on a second device does not invalidate the first, matching Discord.
  const token = issueToken(user.id, user.tokenVersion);
  return { user: sanitizeUser(user), token };
}

/**
 * Full verification: decodes the token, checks its internal signature, AND
 * confirms the embedded tokenVersion still matches the user's current one
 * in the DB. That last check is what makes logout/password-reset actually
 * invalidate a token — decodeToken() alone only proves the token wasn't
 * tampered with, not that it's still live.
 */
export async function verifyToken(rawToken: string) {
  const decoded = decodeToken(rawToken);
  if (!decoded) return null;

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || user.tokenVersion !== decoded.tokenVersion) return null;

  return user;
}

export async function logout(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
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
    // tokenVersion bump invalidates every previously-issued token for this
    // user in one write — no separate session table to clean up.
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash, tokenVersion: { increment: 1 } } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
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

export function sanitizeUser<T extends { passwordHash: string; tokenVersion?: number }>(user: T) {
  const { passwordHash, tokenVersion, ...rest } = user;
  return rest;
}
