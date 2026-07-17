import { api } from "./client";
import type { Guild, Member, Role, Channel } from "../store/app";

export async function createGuild(name: string, discoverable?: boolean) {
  const res = await api.post("/guilds", { name, discoverable });
  return res.data.guild as Guild;
}

export async function listMyGuilds() {
  const res = await api.get("/guilds");
  return res.data.guilds as Guild[];
}

export async function getGuild(guildId: string) {
  const res = await api.get(`/guilds/${guildId}`);
  return res.data.guild as Guild;
}

export async function updateGuild(guildId: string, data: { name?: string; discoverable?: boolean }) {
  const res = await api.patch(`/guilds/${guildId}`, data);
  return res.data.guild as Guild;
}

export interface DiscoverableGuild {
  id: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
  onlineCount: number;
}

export async function listDiscoverableGuilds() {
  const res = await api.get("/guilds/discovery");
  return res.data.guilds as DiscoverableGuild[];
}

export async function joinDiscoverableGuild(guildId: string) {
  const res = await api.post(`/guilds/${guildId}/discovery/join`);
  return res.data.guild as Guild;
}

export async function uploadGuildIcon(guildId: string, file: File) {
  const form = new FormData();
  form.append("icon", file);
  const res = await api.post(`/guilds/${guildId}/icon`, form);
  return res.data.guild as Guild;
}

export async function deleteGuild(guildId: string) {
  await api.delete(`/guilds/${guildId}`);
}

export async function leaveGuild(guildId: string) {
  await api.post(`/guilds/${guildId}/leave`);
}

export async function listMembers(guildId: string) {
  const res = await api.get(`/guilds/${guildId}/members`);
  return res.data.members as Member[];
}

export async function createCategory(guildId: string, name: string) {
  const res = await api.post(`/guilds/${guildId}/categories`, { name });
  return res.data.category;
}

export async function createChannel(guildId: string, input: { name: string; type: "TEXT" | "VOICE"; categoryId?: string | null }) {
  const res = await api.post(`/guilds/${guildId}/channels`, input);
  return res.data.channel as Channel;
}

export async function updateChannel(guildId: string, channelId: string, data: Partial<Channel>) {
  const res = await api.patch(`/guilds/${guildId}/channels/${channelId}`, data);
  return res.data.channel as Channel;
}

export async function deleteChannel(guildId: string, channelId: string) {
  await api.delete(`/guilds/${guildId}/channels/${channelId}`);
}

export async function createRole(guildId: string, name: string) {
  const res = await api.post(`/guilds/${guildId}/roles`, { name });
  return res.data.role as Role;
}

export async function updateRole(guildId: string, roleId: string, data: Partial<{ name: string; color: number; permissions: string; hoist: boolean; mentionable: boolean; position: number }>) {
  const res = await api.patch(`/guilds/${guildId}/roles/${roleId}`, data);
  return res.data.role as Role;
}

export async function deleteRole(guildId: string, roleId: string) {
  await api.delete(`/guilds/${guildId}/roles/${roleId}`);
}

export async function assignRole(guildId: string, userId: string, roleId: string) {
  await api.put(`/guilds/${guildId}/members/${userId}/roles/${roleId}`);
}

export async function removeRole(guildId: string, userId: string, roleId: string) {
  await api.delete(`/guilds/${guildId}/members/${userId}/roles/${roleId}`);
}

export async function createInvite(guildId: string, channelId: string, opts?: { maxUses?: number | null; expiresInSeconds?: number | null }) {
  const res = await api.post(`/guilds/${guildId}/invites`, { channelId, ...opts });
  return res.data.invite;
}

export async function listInvites(guildId: string) {
  const res = await api.get(`/guilds/${guildId}/invites`);
  return res.data.invites;
}

export async function deleteInvite(guildId: string, code: string) {
  await api.delete(`/guilds/${guildId}/invites/${code}`);
}

export async function joinByInvite(code: string) {
  const res = await api.post(`/invites/${code}/join`);
  return res.data.guild as Guild;
}

export async function getAuditLog(guildId: string) {
  const res = await api.get(`/guilds/${guildId}/audit-log`);
  return res.data.entries;
}

export async function kickMember(guildId: string, userId: string, reason?: string) {
  await api.post(`/guilds/${guildId}/members/${userId}/kick`, { reason });
}

export async function banMember(guildId: string, userId: string, reason?: string) {
  await api.post(`/guilds/${guildId}/members/${userId}/ban`, { reason });
}

export async function unbanMember(guildId: string, userId: string) {
  await api.delete(`/guilds/${guildId}/bans/${userId}`);
}

export async function listBans(guildId: string) {
  const res = await api.get(`/guilds/${guildId}/bans`);
  return res.data.bans;
}

export async function timeoutMember(guildId: string, userId: string, minutes: number, reason?: string) {
  await api.post(`/guilds/${guildId}/members/${userId}/timeout`, { minutes, reason });
}

export async function removeTimeout(guildId: string, userId: string) {
  await api.delete(`/guilds/${guildId}/members/${userId}/timeout`);
}

export async function setNickname(guildId: string, userId: string, nickname: string | null) {
  await api.patch(`/guilds/${guildId}/members/${userId}/nickname`, { nickname });
}

export async function listEmojis(guildId: string) {
  const res = await api.get(`/guilds/${guildId}/emojis`);
  return res.data.emojis;
}

export async function uploadEmoji(guildId: string, name: string, file: File) {
  const form = new FormData();
  form.append("name", name);
  form.append("image", file);
  const res = await api.post(`/guilds/${guildId}/emojis`, form);
  return res.data.emoji;
}
