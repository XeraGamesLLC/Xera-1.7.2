import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createGroupDmSchema } from "../validators/friend.schema";
import * as dmService from "../services/dm.service";
import { getIo } from "../sockets";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    res.json({ channels: await dmService.listDmChannels(req.userId!) });
  } catch (err) {
    next(err);
  }
});

router.post("/:userId", async (req, res, next) => {
  try {
    const channel = await dmService.getOrCreateDmChannel(req.userId!, req.params.userId);
    joinBothToChannelRoom(channel.id, [req.userId!, req.params.userId]);
    res.status(201).json({ channel });
  } catch (err) {
    next(err);
  }
});

router.post("/group", validate({ body: createGroupDmSchema }), async (req, res, next) => {
  try {
    const channel = await dmService.createGroupDm(req.userId!, req.body.participantIds, req.body.name);
    joinBothToChannelRoom(channel.id, [req.userId!, ...req.body.participantIds]);
    res.status(201).json({ channel });
  } catch (err) {
    next(err);
  }
});

router.post("/group/:channelId/leave", async (req, res, next) => {
  try {
    await dmService.leaveGroupDm(req.params.channelId, req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/group/:channelId/members/:userId", async (req, res, next) => {
  try {
    await dmService.addToGroupDm(req.params.channelId, req.userId!, req.params.userId);
    joinBothToChannelRoom(req.params.channelId, [req.params.userId]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/** Pushes any already-connected sockets for these users into the new channel room immediately. */
function joinBothToChannelRoom(channelId: string, userIds: string[]) {
  try {
    const io = getIo();
    for (const userId of userIds) {
      io.in(`user:${userId}`).socketsJoin(`channel:${channelId}`);
    }
  } catch {
    // socket server not up yet (e.g. during tests) — new connections will join via ChannelMember lookup anyway
  }
}

export default router;
