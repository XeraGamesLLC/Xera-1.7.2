import { Router } from "express";
import path from "node:path";
import sharp from "sharp";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { uploadLimiter } from "../middleware/rateLimit";
import { avatarUpload } from "../middleware/upload";
import { updateProfileSchema, updateStatusSchema, lookupUserSchema } from "../validators/user.schema";
import { prisma } from "../lib/prisma";
import { sanitizeUser } from "../services/auth.service";
import { AppError } from "../middleware/errorHandler";
import { env } from "../config/env";

const router = Router();

router.patch("/me", requireAuth, validate({ body: updateProfileSchema }), async (req, res, next) => {
  try {
    const user = await prisma.user.update({ where: { id: req.userId }, data: req.body });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.patch("/me/status", requireAuth, validate({ body: updateStatusSchema }), async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { status: req.body.status },
    });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/me/avatar", requireAuth, uploadLimiter, avatarUpload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "No file uploaded");

    const previous = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatarUrl: true } });

    // Re-encode through sharp: strips EXIF/metadata, normalizes format, and
    // guards against polyglot files (e.g. an image with embedded script
    // content) since the output is always a freshly rendered PNG. The output
    // filename is freshly generated (not derived from req.file.path) so it
    // can never collide with the input path — sharp refuses to use the same
    // file for input and output, which previously 500'd on every .png
    // upload, since the naive derived name matched the source file exactly.
    const processedPath = path.join(path.dirname(req.file.path), `${nanoid(24)}.png`);
    try {
      await sharp(req.file.path).resize(256, 256, { fit: "cover" }).png().toFile(processedPath);
    } catch {
      throw new AppError(400, "Could not process that image - is it a valid image file?");
    } finally {
      await fs.unlink(req.file.path).catch(() => undefined);
    }

    const avatarUrl = `/uploads/avatars/${path.basename(processedPath)}`;
    const user = await prisma.user.update({ where: { id: req.userId }, data: { avatarUrl } });

    // The old avatar file is never referenced again once the DB row points
    // at the new one - without this it just accumulates on disk forever,
    // one orphaned file per re-upload.
    if (previous?.avatarUrl?.startsWith("/uploads/avatars/")) {
      const oldPath = path.join(env.UPLOAD_DIR, previous.avatarUrl.slice("/uploads/".length));
      await fs.unlink(oldPath).catch(() => undefined);
    }

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get("/lookup", requireAuth, validate({ query: lookupUserSchema }), async (req, res, next) => {
  try {
    const { username, discriminator } = req.query as unknown as { username: string; discriminator: string };
    const user = await prisma.user.findUnique({ where: { username_discriminator: { username, discriminator } } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: publicProfile(user) });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: publicProfile(user) });
  } catch (err) {
    next(err);
  }
});

function publicProfile(user: {
  id: string;
  username: string;
  discriminator: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  aboutMe: string | null;
  status: string;
  customStatus: string | null;
  createdAt: Date;
}) {
  const { id, username, discriminator, avatarUrl, bannerUrl, aboutMe, status, customStatus, createdAt } = user;
  return { id, username, discriminator, avatarUrl, bannerUrl, aboutMe, status, customStatus, createdAt };
}

export default router;
