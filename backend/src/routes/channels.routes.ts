import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { uploadLimiter } from "../middleware/rateLimit";
import { attachmentUpload } from "../middleware/upload";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";
import { assertChannelPermission } from "../services/permission.service";
import * as messageService from "../services/message.service";
import { generateSnowflake } from "../utils/snowflake";
import { emitToChannel } from "../sockets";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const historyQuerySchema = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const searchQuerySchema = z.object({ q: z.string().min(1).max(200) });

async function assertCanView(channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) throw new AppError(404, "Channel not found");

  if (channel.guildId) {
    await assertChannelPermission(channelId, userId, "VIEW_CHANNEL");
  } else {
    const membership = await prisma.channelMember.findUnique({ where: { channelId_userId: { channelId, userId } } });
    if (!membership) throw new AppError(403, "Not a participant of this conversation");
  }
  return channel;
}

router.get("/:channelId/messages", validate({ query: historyQuerySchema }), async (req, res, next) => {
  try {
    await assertCanView(req.params.channelId, req.userId!);
    const { before, limit } = req.query as unknown as { before?: string; limit?: number };
    const messages = await messageService.listMessages(req.params.channelId, { before, limit });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

router.get("/:channelId/messages/pins", async (req, res, next) => {
  try {
    await assertCanView(req.params.channelId, req.userId!);
    const messages = await messageService.listPinned(req.params.channelId);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

router.get("/:channelId/messages/search", validate({ query: searchQuerySchema }), async (req, res, next) => {
  try {
    await assertCanView(req.params.channelId, req.userId!);
    const messages = await messageService.searchMessages(req.params.channelId, (req.query as any).q);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

// Files are uploaded ahead of the message: the client POSTs here, gets back
// an attachmentId, then includes that id in the message:send socket event.
router.post("/:channelId/attachments", uploadLimiter, attachmentUpload.single("file"), async (req, res, next) => {
  try {
    await assertCanView(req.params.channelId, req.userId!);
    if (!req.file) throw new AppError(400, "No file uploaded");

    const attachment = await prisma.attachment.create({
      data: {
        id: generateSnowflake(),
        uploaderId: req.userId!,
        url: `/uploads/attachments/${req.file.filename}`,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
      },
    });

    res.status(201).json({ attachment });
  } catch (err) {
    next(err);
  }
});

router.put("/:channelId/read-state", async (req, res, next) => {
  try {
    await assertCanView(req.params.channelId, req.userId!);
    const { lastReadMessageId } = req.body as { lastReadMessageId: string };
    await prisma.readState.upsert({
      where: { userId_channelId: { userId: req.userId!, channelId: req.params.channelId } },
      create: { userId: req.userId!, channelId: req.params.channelId, lastReadMessageId, mentionCount: 0 },
      update: { lastReadMessageId, mentionCount: 0 },
    });
    // Lets the other participant's client move its read-receipt indicator
    // live, instead of only finding out next time it re-fetches the channel.
    emitToChannel(req.params.channelId, "read-state:update", {
      channelId: req.params.channelId,
      userId: req.userId,
      lastReadMessageId,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Seeds the initial read-receipt state when a DM is opened - the socket
// event above only covers updates that happen while you're already there.
router.get("/:channelId/read-state", async (req, res, next) => {
  try {
    await assertCanView(req.params.channelId, req.userId!);
    const states = await prisma.readState.findMany({
      where: { channelId: req.params.channelId },
      select: { userId: true, lastReadMessageId: true },
    });
    res.json({ readStates: states });
  } catch (err) {
    next(err);
  }
});

export default router;
