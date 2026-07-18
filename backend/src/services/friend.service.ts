import { prisma } from "../lib/prisma";
import { generateSnowflake } from "../utils/snowflake";
import { AppError } from "../middleware/errorHandler";

async function findFriendshipEitherDirection(userA: string, userB: string) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });
}

export async function sendFriendRequest(requesterId: string, username: string, discriminator: string) {
  const addressee = await prisma.user.findUnique({ where: { username_discriminator: { username, discriminator } } });
  if (!addressee) throw new AppError(404, "No user found with that username and tag");
  if (addressee.id === requesterId) throw new AppError(400, "You can't friend yourself");

  const existing = await findFriendshipEitherDirection(requesterId, addressee.id);
  if (existing) {
    if (existing.status === "BLOCKED") throw new AppError(403, "Can't send a friend request to this user");
    if (existing.status === "ACCEPTED") throw new AppError(409, "You're already friends");
    if (existing.requesterId === addressee.id) {
      // They already sent us a request — accept it instead of duplicating.
      return prisma.friendship.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
    }
    throw new AppError(409, "Friend request already pending");
  }

  return prisma.friendship.create({
    data: { id: generateSnowflake(), requesterId, addresseeId: addressee.id, status: "PENDING" },
  });
}

export async function respondToFriendRequest(userId: string, friendshipId: string, accept: boolean) {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || friendship.addresseeId !== userId || friendship.status !== "PENDING") {
    throw new AppError(404, "Friend request not found");
  }

  if (!accept) {
    await prisma.friendship.delete({ where: { id: friendshipId } });
    return null;
  }
  return prisma.friendship.update({ where: { id: friendshipId }, data: { status: "ACCEPTED" } });
}

export async function cancelOrRemoveFriendship(userId: string, otherUserId: string) {
  const friendship = await findFriendshipEitherDirection(userId, otherUserId);
  if (!friendship) throw new AppError(404, "No friendship or request found");
  await prisma.friendship.delete({ where: { id: friendship.id } });
}

export async function blockUser(userId: string, targetUserId: string) {
  if (userId === targetUserId) throw new AppError(400, "You can't block yourself");
  const existing = await findFriendshipEitherDirection(userId, targetUserId);

  if (existing) {
    return prisma.friendship.update({
      where: { id: existing.id },
      data: { requesterId: userId, addresseeId: targetUserId, status: "BLOCKED" },
    });
  }
  return prisma.friendship.create({
    data: { id: generateSnowflake(), requesterId: userId, addresseeId: targetUserId, status: "BLOCKED" },
  });
}

export async function unblockUser(userId: string, targetUserId: string) {
  const friendship = await prisma.friendship.findFirst({
    where: { requesterId: userId, addresseeId: targetUserId, status: "BLOCKED" },
  });
  if (!friendship) throw new AppError(404, "Not blocked");
  await prisma.friendship.delete({ where: { id: friendship.id } });
}

export async function isBlocked(userA: string, userB: string): Promise<boolean> {
  const friendship = await findFriendshipEitherDirection(userA, userB);
  return friendship?.status === "BLOCKED";
}

export type FriendStatus = "NONE" | "FRIENDS" | "PENDING_OUTGOING" | "PENDING_INCOMING" | "BLOCKED";

/**
 * Resolves what `viewerId` can actually do about `targetId` right now - lets
 * the profile UI show "Remove Friend"/"Request Sent"/"Accept Request"
 * instead of always offering "Add Friend" regardless of the real
 * relationship, which is misleading (the request still gets rejected
 * server-side, but a stale/never-fetched client-side friends list is not a
 * safe thing to gate the button on, so this is computed fresh here instead).
 */
export async function getFriendStatus(viewerId: string, targetId: string): Promise<FriendStatus> {
  if (viewerId === targetId) return "NONE";
  const friendship = await findFriendshipEitherDirection(viewerId, targetId);
  if (!friendship) return "NONE";
  if (friendship.status === "BLOCKED") return "BLOCKED";
  if (friendship.status === "ACCEPTED") return "FRIENDS";
  return friendship.requesterId === viewerId ? "PENDING_OUTGOING" : "PENDING_INCOMING";
}

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  discriminator: true,
  avatarUrl: true,
  status: true,
  customStatus: true,
} as const;

export async function listFriends(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: PUBLIC_USER_SELECT },
      addressee: { select: PUBLIC_USER_SELECT },
    },
  });
  return friendships.map((f) => (f.requesterId === userId ? f.addressee : f.requester));
}

export async function listIncomingRequests(userId: string) {
  return prisma.friendship.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    include: { requester: { select: PUBLIC_USER_SELECT } },
  });
}

export async function listOutgoingRequests(userId: string) {
  return prisma.friendship.findMany({
    where: { requesterId: userId, status: "PENDING" },
    include: { addressee: { select: PUBLIC_USER_SELECT } },
  });
}

export async function listBlocked(userId: string) {
  return prisma.friendship.findMany({
    where: { requesterId: userId, status: "BLOCKED" },
    include: { addressee: { select: PUBLIC_USER_SELECT } },
  });
}
