import { Router } from "express";
import { validate } from "../middleware/validate";
import { authLimiter, loginLimiter } from "../middleware/rateLimit";
import { antiVpnGate } from "../middleware/antiVpn";
import { requireAuth } from "../middleware/auth";
import {
  registerSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators/auth.schema";
import * as authService from "../services/auth.service";
import { prisma } from "../lib/prisma";

const router = Router();

router.post("/register", authLimiter, antiVpnGate, validate({ body: registerSchema }), async (req, res, next) => {
  try {
    const user = await authService.register(req.body, req.ip ?? "unknown");
    res.status(201).json({ user, message: "Account created. Check your email to verify it." });
  } catch (err) {
    next(err);
  }
});

router.post("/login", loginLimiter, validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const { user, token } = await authService.login(req.body, req.ip ?? "unknown");
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
});

// Invalidates the token that's actually presented (bumps tokenVersion) —
// there's no separate refresh token to also revoke, and no other device's
// session is affected unless they were using this exact same token value,
// same as real Discord.
router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await authService.logout(req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post(
  "/password-reset/request",
  authLimiter,
  validate({ body: requestPasswordResetSchema }),
  async (req, res, next) => {
    try {
      await authService.requestPasswordReset(req.body.email);
      res.json({ message: "If that email exists, a reset link has been sent." });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/password-reset/confirm",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  async (req, res, next) => {
    try {
      await authService.resetPassword(req.body.token, req.body.newPassword);
      res.json({ message: "Password updated. Please log in again." });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/verify-email", authLimiter, validate({ body: verifyEmailSchema }), async (req, res, next) => {
  try {
    await authService.verifyEmail(req.body.token);
    res.json({ message: "Email verified." });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: authService.sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
