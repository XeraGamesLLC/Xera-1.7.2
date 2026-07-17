import { api } from "./client";
import type { XraUser } from "../store/auth";

export async function registerAccount(input: { username: string; email: string; password: string; agreedToTos: true }) {
  const res = await api.post("/auth/register", input);
  return res.data as { user: XraUser; message: string };
}

export async function login(input: { email: string; password: string }) {
  const res = await api.post("/auth/login", input);
  return res.data as { user: XraUser; token: string };
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function fetchMe() {
  const res = await api.get("/auth/me");
  return res.data as { user: XraUser };
}

export async function requestPasswordReset(email: string) {
  const res = await api.post("/auth/password-reset/request", { email });
  return res.data as { message: string };
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const res = await api.post("/auth/password-reset/confirm", { token, newPassword });
  return res.data as { message: string };
}
