import { logger } from "../lib/logger";

/**
 * Stub email transport — no SMTP/provider wired up yet (see CHECKLIST.md).
 * Logs the link that would be emailed so the flow is fully testable in dev.
 * Swap the body of `sendEmail` for a real provider (SES, Postmark, Resend,
 * etc.) when ready; every call site already goes through this one function.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  logger.info(`[email:stub] To: ${to} | Subject: ${subject}\n${body}`);
}

export function sendVerificationEmail(to: string, token: string) {
  return sendEmail(
    to,
    "Verify your XRA account",
    `Verify your email: /verify-email?token=${token}`
  );
}

export function sendPasswordResetEmail(to: string, token: string) {
  return sendEmail(
    to,
    "Reset your XRA password",
    `Reset your password: /reset-password?token=${token}`
  );
}
