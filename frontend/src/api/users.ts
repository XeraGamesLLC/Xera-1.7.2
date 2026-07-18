import { api } from "./client";
import type { XraUser } from "../store/auth";
import type { PrimaryGuild } from "../store/app";

export type FriendStatus = "NONE" | "FRIENDS" | "PENDING_OUTGOING" | "PENDING_INCOMING" | "BLOCKED";

export interface UserProfile {
  id: string;
  username: string;
  discriminator: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  aboutMe: string | null;
  status: string;
  customStatus: string | null;
  createdAt: string;
  primaryGuild: PrimaryGuild | null;
  isDeveloper: boolean;
  friendStatus: FriendStatus;
}

export async function updateProfile(data: { aboutMe?: string; customStatus?: string | null }) {
  const res = await api.patch("/users/me", data);
  return res.data.user as XraUser;
}

export async function updateStatus(status: "ONLINE" | "IDLE" | "DND" | "INVISIBLE") {
  const res = await api.patch("/users/me/status", { status });
  return res.data.user as XraUser;
}

export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("avatar", file);
  const res = await api.post("/users/me/avatar", form);
  return res.data.user as XraUser;
}

export async function uploadBanner(file: File) {
  const form = new FormData();
  form.append("banner", file);
  const res = await api.post("/users/me/banner", form);
  return res.data.user as XraUser;
}

export async function setPrimaryGuild(guildId: string | null) {
  const res = await api.patch("/users/me/primary-guild", { guildId });
  return res.data.user as XraUser;
}

export async function lookupUser(username: string, discriminator: string) {
  const res = await api.get("/users/lookup", { params: { username, discriminator } });
  return res.data.user as UserProfile;
}

export async function getUser(id: string) {
  const res = await api.get(`/users/${id}`);
  return res.data.user as UserProfile;
}
