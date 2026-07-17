import { api } from "./client";
import type { Message } from "../store/app";

export async function fetchMessages(channelId: string, before?: string) {
  const res = await api.get(`/channels/${channelId}/messages`, { params: { before, limit: 50 } });
  return (res.data.messages as Message[]).slice().reverse();
}

export async function fetchPins(channelId: string) {
  const res = await api.get(`/channels/${channelId}/messages/pins`);
  return res.data.messages as Message[];
}

export async function searchMessages(channelId: string, q: string) {
  const res = await api.get(`/channels/${channelId}/messages/search`, { params: { q } });
  return res.data.messages as Message[];
}

export async function uploadAttachment(channelId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`/channels/${channelId}/attachments`, form);
  return res.data.attachment as { id: string; url: string; filename: string };
}

export async function markRead(channelId: string, lastReadMessageId: string) {
  await api.put(`/channels/${channelId}/read-state`, { lastReadMessageId });
}
