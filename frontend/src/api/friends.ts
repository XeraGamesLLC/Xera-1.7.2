import { api } from "./client";
import type { PublicUser } from "../store/app";

export async function listFriends() {
  const res = await api.get("/friends");
  return res.data.friends as PublicUser[];
}

export async function listIncoming() {
  const res = await api.get("/friends/requests/incoming");
  return res.data.requests;
}

export async function listOutgoing() {
  const res = await api.get("/friends/requests/outgoing");
  return res.data.requests;
}

export async function listBlocked() {
  const res = await api.get("/friends/blocked");
  return res.data.blocked;
}

export async function sendFriendRequest(username: string, discriminator: string) {
  const res = await api.post("/friends/requests", { username, discriminator });
  return res.data.friendship;
}

export async function acceptRequest(id: string) {
  await api.post(`/friends/requests/${id}/accept`);
}

export async function declineRequest(id: string) {
  await api.post(`/friends/requests/${id}/decline`);
}

export async function removeFriend(userId: string) {
  await api.delete(`/friends/${userId}`);
}

export async function blockUser(userId: string) {
  await api.post(`/friends/${userId}/block`);
}

export async function unblockUser(userId: string) {
  await api.post(`/friends/${userId}/unblock`);
}
