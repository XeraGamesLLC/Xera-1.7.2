import { api } from "./client";
import type { XraUser } from "../store/auth";

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

export async function lookupUser(username: string, discriminator: string) {
  const res = await api.get("/users/lookup", { params: { username, discriminator } });
  return res.data.user;
}

export async function getUser(id: string) {
  const res = await api.get(`/users/${id}`);
  return res.data.user;
}
