import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "node:path";
import { env, corsOrigins } from "./config/env";
import { generalLimiter } from "./middleware/rateLimit";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { ipBanGate } from "./middleware/ipBanGate";

import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import guildsRoutes from "./routes/guilds.routes";
import channelsRoutes from "./routes/channels.routes";
import friendsRoutes from "./routes/friends.routes";
import dmsRoutes from "./routes/dms.routes";
import invitesRoutes from "./routes/invites.routes";
import adminRoutes from "./routes/admin.routes";

export const app = express();

// Trust one hop of reverse proxy (nginx/load balancer) so req.ip reflects the
// real client IP for rate limiting — required for the limiters to key correctly
// when this runs behind the bundled nginx container.
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // cdn.jsdelivr.net serves the Twemoji image set used for emoji
        // rendering (frontend/src/utils/twemoji.ts) — the same emoji set
        // Discord itself uses.
        imgSrc: ["'self'", "data:", "blob:", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", ...corsOrigins],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors({ origin: corsOrigins }));
app.use(ipBanGate);
app.use(express.json({ limit: "256kb" }));
app.use(generalLimiter);

// Media types the frontend renders inline (<img>/<video>/<audio>/embedded
// pdf viewer) are served as-is; everything else is forced to download
// rather than rendered in-browser, so an uploaded file can never execute
// as active content even if a dangerous extension somehow slipped past the
// upload filter.
const INLINE_RENDER_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".mp4", ".webm", ".mov",
  ".mp3", ".ogg", ".wav",
  ".pdf",
]);
app.use(
  "/uploads",
  express.static(path.resolve(env.UPLOAD_DIR), {
    setHeaders: (res, filePath) => {
      if (!INLINE_RENDER_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
        res.setHeader("Content-Disposition", "attachment");
      }
      // Avatars and server icons get a brand-new filename on every upload,
      // so there's never a legitimate reason to reuse a cached response for
      // one of these paths — force a full revalidation every time so a
      // browser (or an intermediate proxy) can never keep serving a
      // previously-cached failure for what looks to the user like "my
      // profile picture" rather than a specific, disposable file.
      const normalized = filePath.replace(/\\/g, "/");
      if (normalized.includes("/avatars/") || normalized.includes("/guild-icons/")) {
        res.setHeader("Cache-Control", "no-store");
      }
    },
  })
);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/guilds", guildsRoutes);
app.use("/api/channels", channelsRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/dms", dmsRoutes);
app.use("/api/invites", invitesRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
