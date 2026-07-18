import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { AppError } from "../middleware/errorHandler";
import { ipBanSchema } from "../validators/admin.schema";
import { isSuperAdminUserId } from "../services/superAdmin.service";
import * as ipBanService from "../services/ipBan.service";
import { getIo } from "../sockets";

const router = Router();
router.use(requireAuth);

// Every route below is gated on the hardcoded super-admin identity, resolved
// server-side from the authenticated user's row on every request — nothing
// about who's allowed here is ever taken from the client.
async function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!(await isSuperAdminUserId(req.userId!))) {
      throw new AppError(403, "Not authorized");
    }
    next();
  } catch (err) {
    next(err);
  }
}
router.use(requireSuperAdmin);

router.post("/ip-bans", validate({ body: ipBanSchema }), async (req, res, next) => {
  try {
    const actorIp = req.ip ?? "unknown";
    if (req.body.userId) {
      const ips = await ipBanService.banUserByIp(req.userId!, req.body.userId, req.body.reason, actorIp);
      try {
        getIo().in(`user:${req.body.userId}`).disconnectSockets(true);
      } catch {
        // socket server not initialized (tests) — fine, the IP ban + revoked
        // token still take effect on their next request
      }
      res.status(201).json({ bannedIps: ips });
    } else {
      const ban = await ipBanService.banIpAddress(req.userId!, req.body.ipAddress, req.body.reason, actorIp);
      res.status(201).json({ ban });
    }
  } catch (err) {
    next(err);
  }
});

router.get("/ip-bans", async (_req, res, next) => {
  try {
    res.json({ bans: await ipBanService.listIpBans() });
  } catch (err) {
    next(err);
  }
});

router.delete("/ip-bans/:id", async (req, res, next) => {
  try {
    await ipBanService.unbanIp(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
