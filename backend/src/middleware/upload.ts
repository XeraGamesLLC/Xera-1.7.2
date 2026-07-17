import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

const AVATAR_MIME_ALLOWLIST = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const ATTACHMENT_MIME_ALLOWLIST = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/ogg",
  "application/pdf",
  "text/plain",
]);

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function makeStorage(subdir: string) {
  const dest = path.join(env.UPLOAD_DIR, subdir);
  ensureDir(dest);
  return multer.diskStorage({
    destination: dest,
    filename: (_req, file, cb) => {
      // Never trust the client's filename — generate our own and keep only
      // a safe, lowercased extension derived from the original.
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
      cb(null, `${nanoid(24)}${ext}`);
    },
  });
}

export const avatarUpload = multer({
  storage: makeStorage("avatars"),
  limits: { fileSize: env.MAX_AVATAR_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!AVATAR_MIME_ALLOWLIST.has(file.mimetype)) {
      return cb(new AppError(400, "Unsupported avatar file type"));
    }
    cb(null, true);
  },
});

export const attachmentUpload = multer({
  storage: makeStorage("attachments"),
  limits: { fileSize: env.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ATTACHMENT_MIME_ALLOWLIST.has(file.mimetype)) {
      return cb(new AppError(400, "Unsupported attachment file type"));
    }
    cb(null, true);
  },
});

export const emojiUpload = multer({
  storage: makeStorage("emoji"),
  limits: { fileSize: 256 * 1024 }, // 256KB, matches old Discord's custom emoji cap
  fileFilter: (_req, file, cb) => {
    if (!AVATAR_MIME_ALLOWLIST.has(file.mimetype)) {
      return cb(new AppError(400, "Unsupported emoji file type"));
    }
    cb(null, true);
  },
});
