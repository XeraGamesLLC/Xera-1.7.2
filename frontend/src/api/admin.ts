import { api } from "./client";

export interface IpBan {
  id: string;
  ipAddress: string;
  reason: string | null;
  bannedBy: string;
  createdAt: string;
}

// Every call here 403s server-side for anyone but the hardcoded platform
// super-admin (see backend/src/utils/superAdmin.ts) — the frontend only
// ever shows the entry point for it in the first place (see UserPanel /
// UserSettingsModal), it isn't what enforces the restriction.
export async function ipBanUser(userId: string, reason?: string) {
  const res = await api.post("/admin/ip-bans", { userId, reason });
  return res.data.bannedIps as string[];
}

export async function ipBanAddress(ipAddress: string, reason?: string) {
  const res = await api.post("/admin/ip-bans", { ipAddress, reason });
  return res.data.ban as IpBan;
}

export async function listIpBans() {
  const res = await api.get("/admin/ip-bans");
  return res.data.bans as IpBan[];
}

export async function unbanIp(id: string) {
  await api.delete(`/admin/ip-bans/${id}`);
}
