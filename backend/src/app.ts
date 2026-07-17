import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { env, corsOrigins } from "./config/env";
import { generalLimiter } from "./middleware/rateLimit";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import guildsRoutes from "./routes/guilds.routes";
import channelsRoutes from "./routes/channels.routes";
import friendsRoutes from "./routes/friends.routes";
import dmsRoutes from "./routes/dms.routes";
import invitesRoutes from "./routes/invites.routes";

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
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", ...corsOrigins],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));
app.use(generalLimiter);

app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/guilds", guildsRoutes);
app.use("/api/channels", channelsRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/dms", dmsRoutes);
app.use("/api/invites", invitesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
