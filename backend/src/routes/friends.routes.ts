import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { sendFriendRequestSchema } from "../validators/friend.schema";
import * as friendService from "../services/friend.service";
import { emitToUser } from "../sockets";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const friends = await friendService.listFriends(req.userId!);
    res.json({ friends });
  } catch (err) {
    next(err);
  }
});

router.get("/requests/incoming", async (req, res, next) => {
  try {
    res.json({ requests: await friendService.listIncomingRequests(req.userId!) });
  } catch (err) {
    next(err);
  }
});

router.get("/requests/outgoing", async (req, res, next) => {
  try {
    res.json({ requests: await friendService.listOutgoingRequests(req.userId!) });
  } catch (err) {
    next(err);
  }
});

router.get("/blocked", async (req, res, next) => {
  try {
    res.json({ blocked: await friendService.listBlocked(req.userId!) });
  } catch (err) {
    next(err);
  }
});

router.post("/requests", validate({ body: sendFriendRequestSchema }), async (req, res, next) => {
  try {
    const friendship = await friendService.sendFriendRequest(req.userId!, req.body.username, req.body.discriminator);
    emitToUser(friendship.addresseeId, "friend:request", { friendship });
    res.status(201).json({ friendship });
  } catch (err) {
    next(err);
  }
});

router.post("/requests/:id/accept", async (req, res, next) => {
  try {
    const friendship = await friendService.respondToFriendRequest(req.userId!, req.params.id, true);
    if (friendship) {
      emitToUser(friendship.requesterId, "friend:accepted", { friendship });
      emitToUser(friendship.addresseeId, "friend:accepted", { friendship });
    }
    res.json({ friendship });
  } catch (err) {
    next(err);
  }
});

router.post("/requests/:id/decline", async (req, res, next) => {
  try {
    await friendService.respondToFriendRequest(req.userId!, req.params.id, false);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.delete("/:userId", async (req, res, next) => {
  try {
    await friendService.cancelOrRemoveFriendship(req.userId!, req.params.userId);
    emitToUser(req.params.userId, "friend:removed", { userId: req.userId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/:userId/block", async (req, res, next) => {
  try {
    await friendService.blockUser(req.userId!, req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/:userId/unblock", async (req, res, next) => {
  try {
    await friendService.unblockUser(req.userId!, req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
