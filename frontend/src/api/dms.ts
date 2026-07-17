import { api } from "./client";
import type { Channel } from "../store/app";

export async function listDmChannels() {
  const res = await api.get("/dms");
  return res.data.channels as Channel[];
}

export async function openDm(userId: string) {
  const res = await api.post(`/dms/${userId}`);
  return res.data.channel as Channel;
}

export async function createGroupDm(participantIds: string[], name?: string) {
  const res = await api.post("/dms/group", { participantIds, name });
  return res.data.channel as Channel;
}

export async function leaveGroupDm(channelId: string) {
  await api.post(`/dms/group/${channelId}/leave`);
}

export async function addToGroupDm(channelId: string, userId: string) {
  await api.post(`/dms/group/${channelId}/members/${userId}`);
}
