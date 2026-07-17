import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";
import {
  createGuildSchema,
  updateGuildSchema,
  createCategorySchema,
  createChannelSchema,
  updateChannelSchema,
  createRoleSchema,
  updateRoleSchema,
  createInviteSchema,
  overwriteSchema,
} from "../validators/guild.schema";
import * as guildService from "../services/guild.service";
import * as channelService from "../services/channel.service";
import * as roleService from "../services/role.service";
import * as inviteService from "../services/invite.service";
import * as moderationService from "../services/moderation.service";
import { listAuditLog, logAudit } from "../services/auditLog.service";
import { assertGuildPermission, assertChannelPermission } from "../services/permission.service";
import { emitToGuild, emitToUser, getIo } from "../sockets";
import { z } from "zod";
import { emojiUpload, guildIconUpload } from "../middleware/upload";
import { uploadLimiter } from "../middleware/rateLimit";
import { generateSnowflake } from "../utils/snowflake";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";

const router = Router();
router.use(requireAuth);

router.post("/", validate({ body: createGuildSchema }), async (req, res, next) => {
  try {
    const { guild } = await guildService.createGuild(req.userId!, req.body.name, req.body.discoverable);
    res.status(201).json({ guild });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const guilds = await guildService.listUserGuilds(req.userId!);
    res.json({ guilds });
  } catch (err) {
    next(err);
  }
});

// Must be registered before GET /:guildId, or "discovery" would be parsed
// as a guildId and 403/404 instead of matching this route.
router.get("/discovery", async (_req, res, next) => {
  try {
    const guilds = await guildService.listDiscoverableGuilds();
    res.json({ guilds });
  } catch (err) {
    next(err);
  }
});

router.post("/:guildId/discovery/join", async (req, res, next) => {
  try {
    const guild = await guildService.joinDiscoverableGuild(req.params.guildId, req.userId!);
    try {
      getIo().in(`user:${req.userId}`).socketsJoin(`guild:${guild.id}`);
    } catch {
      // socket server not initialized (tests) — fine, next connection will join normally
    }
    res.json({ guild });
  } catch (err) {
    next(err);
  }
});

router.post("/:guildId/icon", uploadLimiter, guildIconUpload.single("icon"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "No file uploaded");

    try {
      await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_GUILD");
    } catch (permErr) {
      // multer's diskStorage already wrote the upload before this handler
      // ran - clean it up on the rejected path too, or every unauthorized
      // attempt leaves an orphaned file behind.
      await fs.unlink(req.file.path).catch(() => undefined);
      throw permErr;
    }

    const processedPath = path.join(path.dirname(req.file.path), `${nanoid(24)}.png`);
    try {
      await sharp(req.file.path).resize(256, 256, { fit: "cover" }).png().toFile(processedPath);
    } catch {
      throw new AppError(400, "Could not process that image - is it a valid image file?");
    } finally {
      await fs.unlink(req.file.path).catch(() => undefined);
    }

    const iconUrl = `/uploads/guild-icons/${path.basename(processedPath)}`;
    const guild = await guildService.updateGuild(req.params.guildId, { iconUrl });
    emitToGuild(req.params.guildId, "guild:update", { guild });
    res.json({ guild });
  } catch (err) {
    next(err);
  }
});

router.get("/:guildId", async (req, res, next) => {
  try {
    const guild = await guildService.getGuildDetail(req.params.guildId, req.userId!);
    res.json({ guild: serializeGuild(guild) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:guildId", validate({ body: updateGuildSchema }), async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_GUILD");
    const guild = await guildService.updateGuild(req.params.guildId, req.body);
    emitToGuild(req.params.guildId, "guild:update", { guild });
    res.json({ guild });
  } catch (err) {
    next(err);
  }
});

router.delete("/:guildId", async (req, res, next) => {
  try {
    await guildService.deleteGuild(req.params.guildId, req.userId!);
    emitToGuild(req.params.guildId, "guild:delete", { guildId: req.params.guildId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/:guildId/leave", async (req, res, next) => {
  try {
    await guildService.leaveGuild(req.params.guildId, req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/:guildId/members", async (req, res, next) => {
  try {
    const members = await guildService.listMembers(req.params.guildId, req.userId!);
    res.json({ members: members.map(serializeMember) });
  } catch (err) {
    next(err);
  }
});

router.get("/:guildId/audit-log", async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "VIEW_AUDIT_LOG");
    const entries = await listAuditLog(req.params.guildId);
    res.json({ entries });
  } catch (err) {
    next(err);
  }
});

// --- Categories & channels ---

router.post("/:guildId/categories", validate({ body: createCategorySchema }), async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_CHANNELS");
    const category = await channelService.createCategory(req.params.guildId, req.body.name);
    emitToGuild(req.params.guildId, "category:create", { category });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

router.post("/:guildId/channels", validate({ body: createChannelSchema }), async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_CHANNELS");
    const channel = await channelService.createChannel(req.params.guildId, req.userId!, req.body);
    emitToGuild(req.params.guildId, "channel:create", { channel });
    res.status(201).json({ channel });
  } catch (err) {
    next(err);
  }
});

router.patch("/:guildId/channels/:channelId", validate({ body: updateChannelSchema }), async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_CHANNELS");
    const channel = await channelService.updateChannel(req.params.channelId, req.params.guildId, req.userId!, req.body);
    emitToGuild(req.params.guildId, "channel:update", { channel });
    res.json({ channel });
  } catch (err) {
    next(err);
  }
});

router.delete("/:guildId/channels/:channelId", async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_CHANNELS");
    await channelService.deleteChannel(req.params.channelId, req.params.guildId, req.userId!);
    emitToGuild(req.params.guildId, "channel:delete", { channelId: req.params.channelId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.put(
  "/:guildId/channels/:channelId/overwrites",
  validate({ body: overwriteSchema }),
  async (req, res, next) => {
    try {
      await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_ROLES");
      const overwrite = await channelService.setChannelOverwrite(req.params.channelId, {
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        allow: BigInt(req.body.allow),
        deny: BigInt(req.body.deny),
      });
      emitToGuild(req.params.guildId, "channel:overwrite", { channelId: req.params.channelId, overwrite: serializeOverwrite(overwrite) });
      res.json({ overwrite: serializeOverwrite(overwrite) });
    } catch (err) {
      next(err);
    }
  }
);

// --- Roles ---

router.post("/:guildId/roles", validate({ body: createRoleSchema }), async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_ROLES");
    const role = await roleService.createRole(req.params.guildId, req.userId!, req.body.name);
    emitToGuild(req.params.guildId, "role:create", { role: serializeRole(role) });
    res.status(201).json({ role: serializeRole(role) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:guildId/roles/:roleId", validate({ body: updateRoleSchema }), async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_ROLES");
    const data: any = { ...req.body };
    if (data.permissions !== undefined) data.permissions = BigInt(data.permissions);
    const role = await roleService.updateRole(req.params.roleId, req.params.guildId, req.userId!, data);
    emitToGuild(req.params.guildId, "role:update", { role: serializeRole(role) });
    res.json({ role: serializeRole(role) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:guildId/roles/:roleId", async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_ROLES");
    await roleService.deleteRole(req.params.roleId, req.params.guildId, req.userId!);
    emitToGuild(req.params.guildId, "role:delete", { roleId: req.params.roleId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.put("/:guildId/members/:userId/roles/:roleId", async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_ROLES");
    await roleService.assignRole(req.params.guildId, req.userId!, req.params.userId, req.params.roleId);
    emitToGuild(req.params.guildId, "member:role_update", { userId: req.params.userId, roleId: req.params.roleId, added: true });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.delete("/:guildId/members/:userId/roles/:roleId", async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_ROLES");
    await roleService.removeRole(req.params.guildId, req.userId!, req.params.userId, req.params.roleId);
    emitToGuild(req.params.guildId, "member:role_update", { userId: req.params.userId, roleId: req.params.roleId, added: false });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// --- Invites ---

router.post("/:guildId/invites", validate({ body: createInviteSchema }), async (req, res, next) => {
  try {
    await assertChannelPermission(req.body.channelId, req.userId!, "CREATE_INSTANT_INVITE");
    const invite = await inviteService.createInvite(req.params.guildId, req.body.channelId, req.userId!, req.body);
    res.status(201).json({ invite });
  } catch (err) {
    next(err);
  }
});

router.get("/:guildId/invites", async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_GUILD");
    const invites = await inviteService.listGuildInvites(req.params.guildId);
    res.json({ invites });
  } catch (err) {
    next(err);
  }
});

router.delete("/:guildId/invites/:code", async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_GUILD");
    await inviteService.deleteInvite(req.params.code, req.params.guildId, req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// --- Moderation ---

const reasonSchema = z.object({ reason: z.string().max(512).optional() });
const timeoutSchema = z.object({ minutes: z.number().int().min(1).max(60 * 24 * 28), reason: z.string().max(512).optional() });
const nicknameSchema = z.object({ nickname: z.string().max(32).nullable() });

router.post("/:guildId/members/:userId/kick", validate({ body: reasonSchema }), async (req, res, next) => {
  try {
    await moderationService.kickMember(req.params.guildId, req.userId!, req.params.userId, req.body.reason);
    emitToGuild(req.params.guildId, "member:remove", { userId: req.params.userId });
    emitToUser(req.params.userId, "guild:kicked", { guildId: req.params.guildId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/:guildId/members/:userId/ban", validate({ body: reasonSchema }), async (req, res, next) => {
  try {
    await moderationService.banMember(req.params.guildId, req.userId!, req.params.userId, req.body.reason);
    emitToGuild(req.params.guildId, "member:remove", { userId: req.params.userId });
    emitToUser(req.params.userId, "guild:banned", { guildId: req.params.guildId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.delete("/:guildId/bans/:userId", async (req, res, next) => {
  try {
    await moderationService.unbanMember(req.params.guildId, req.userId!, req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/:guildId/bans", async (req, res, next) => {
  try {
    const bans = await moderationService.listBans(req.params.guildId, req.userId!);
    res.json({ bans });
  } catch (err) {
    next(err);
  }
});

router.post("/:guildId/members/:userId/timeout", validate({ body: timeoutSchema }), async (req, res, next) => {
  try {
    const until = await moderationService.timeoutMember(
      req.params.guildId,
      req.userId!,
      req.params.userId,
      req.body.minutes,
      req.body.reason
    );
    emitToGuild(req.params.guildId, "member:timeout", { userId: req.params.userId, until });
    res.json({ until });
  } catch (err) {
    next(err);
  }
});

router.delete("/:guildId/members/:userId/timeout", async (req, res, next) => {
  try {
    await moderationService.removeTimeout(req.params.guildId, req.userId!, req.params.userId);
    emitToGuild(req.params.guildId, "member:timeout", { userId: req.params.userId, until: null });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.patch("/:guildId/members/:userId/nickname", validate({ body: nicknameSchema }), async (req, res, next) => {
  try {
    const member = await moderationService.setNickname(req.params.guildId, req.userId!, req.params.userId, req.body.nickname);
    emitToGuild(req.params.guildId, "member:update", { userId: req.params.userId, nickname: member.nickname });
    res.json({ member });
  } catch (err) {
    next(err);
  }
});

// --- Custom emoji ---

router.post("/:guildId/emojis", uploadLimiter, emojiUpload.single("image"), async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_EMOJIS");
    if (!req.file) throw new AppError(400, "No file uploaded");
    const name = String(req.body.name ?? "").trim();
    if (!/^[a-zA-Z0-9_]{2,32}$/.test(name)) throw new AppError(400, "Invalid emoji name");

    const emoji = await prisma.customEmoji.create({
      data: {
        id: generateSnowflake(),
        guildId: req.params.guildId,
        name,
        imageUrl: `/uploads/emoji/${req.file.filename}`,
        createdBy: req.userId!,
      },
    });
    await logAudit({ guildId: req.params.guildId, actorId: req.userId!, action: "EMOJI_CREATE", targetId: emoji.id });
    emitToGuild(req.params.guildId, "emoji:create", { emoji });
    res.status(201).json({ emoji });
  } catch (err) {
    next(err);
  }
});

router.get("/:guildId/emojis", async (req, res, next) => {
  try {
    const emojis = await prisma.customEmoji.findMany({ where: { guildId: req.params.guildId } });
    res.json({ emojis });
  } catch (err) {
    next(err);
  }
});

router.delete("/:guildId/emojis/:emojiId", async (req, res, next) => {
  try {
    await assertGuildPermission(req.params.guildId, req.userId!, "MANAGE_EMOJIS");
    await prisma.customEmoji.delete({ where: { id: req.params.emojiId } });
    emitToGuild(req.params.guildId, "emoji:delete", { emojiId: req.params.emojiId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function serializeGuild(guild: any) {
  return {
    ...guild,
    roles: guild.roles?.map(serializeRole),
  };
}

function serializeRole(role: any) {
  return { ...role, permissions: role.permissions.toString() };
}

function serializeOverwrite(o: any) {
  return { ...o, allow: o.allow.toString(), deny: o.deny.toString() };
}

function serializeMember(m: any) {
  return {
    id: m.id,
    userId: m.userId,
    nickname: m.nickname,
    joinedAt: m.joinedAt,
    isTimedOut: m.isTimedOut,
    timeoutUntil: m.timeoutUntil,
    user: m.user,
    roles: m.roles.map((r: any) => serializeRole(r.role)),
  };
}

export default router;
