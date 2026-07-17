import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { resolveAndUseInvite } from "../services/invite.service";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { getIo } from "../sockets";

const router = Router();
router.use(requireAuth);

router.get("/:code", async (req, res, next) => {
  try {
    const invite = await prisma.invite.findUnique({
      where: { code: req.params.code },
      include: { guild: { select: { id: true, name: true, iconUrl: true } }, channel: { select: { name: true } } },
    });
    if (!invite) throw new AppError(404, "Invite not found or expired");
    if (invite.expiresAt && invite.expiresAt < new Date()) throw new AppError(410, "Invite has expired");
    res.json({ invite });
  } catch (err) {
    next(err);
  }
});

router.post("/:code/join", async (req, res, next) => {
  try {
    const guild = await resolveAndUseInvite(req.params.code, req.userId!);
    if (guild) {
      try {
        getIo().in(`user:${req.userId}`).socketsJoin(`guild:${guild.id}`);
      } catch {
        // socket server not initialized (tests) — fine, next connection will join normally
      }
    }
    res.json({ guild });
  } catch (err) {
    next(err);
  }
});

export default router;
