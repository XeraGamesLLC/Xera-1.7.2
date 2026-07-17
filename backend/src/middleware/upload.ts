import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

const AVATAR_MIME_ALLOWLIST = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
// The multipart Content-Type a client declares for a file part is entirely
// client-controlled and trivially spoofable, so checking mimetype alone
// isn't real validation. Requiring the filename extension to also match an
// actual image extension closes that off for uploads (avatars, custom
// emoji) that are meant to be images-only — a file named "evil.html" with a
// spoofed "image/png" Content-Type is rejected here regardless.
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

// Discord-style attachments accept nearly any file type, so this is a
// blocklist of extensions that a browser or OS could execute/render as
// active content rather than a narrow allowlist. Checked against the
// original filename regardless of the claimed multipart mimetype, since
// that field is client-supplied and not trustworthy on its own — combined
// with the forced-download headers in app.ts for non-media types and
// helmet's nosniff, this keeps uploaded files from ever running as script
// in the browser (stored XSS) or as a program on the host OS.
const DANGEROUS_EXTENSIONS = new Set([
  ".html", ".htm", ".xhtml", ".mhtml", ".shtml",
  ".svg", ".js", ".mjs", ".cjs", ".jsx",
  ".exe", ".msi", ".dll", ".com", ".scr", ".cpl", ".gadget", ".lnk", ".hta",
  ".bat", ".cmd", ".ps1", ".psm1", ".vbs", ".vbe", ".wsf", ".wsh", ".msc",
  ".jar", ".apk", ".app",
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
    const ext = path.extname(file.originalname).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext) || !AVATAR_MIME_ALLOWLIST.has(file.mimetype)) {
      return cb(new AppError(400, "Unsupported avatar file type"));
    }
    cb(null, true);
  },
});

export const attachmentUpload = multer({
  storage: makeStorage("attachments"),
  limits: { fileSize: env.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return cb(new AppError(400, "This file type is not allowed"));
    }
    cb(null, true);
  },
});

export const emojiUpload = multer({
  storage: makeStorage("emoji"),
  limits: { fileSize: 256 * 1024 }, // 256KB, matches old Discord's custom emoji cap
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext) || !AVATAR_MIME_ALLOWLIST.has(file.mimetype)) {
      return cb(new AppError(400, "Unsupported emoji file type"));
    }
    cb(null, true);
  },
});
