import { create } from "zustand";
import type { PrimaryGuild } from "./app";

export interface XraUser {
  id: string;
  username: string;
  discriminator: string;
  email?: string;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  aboutMe?: string | null;
  status: "ONLINE" | "IDLE" | "DND" | "INVISIBLE" | "OFFLINE";
  customStatus: string | null;
  primaryGuild?: PrimaryGuild | null;
  createdAt?: string;
  isDeveloper?: boolean;
}

const TOKEN_STORAGE_KEY = "xra_token";

interface AuthState {
  user: XraUser | null;
  token: string | null;
  isHydrating: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: XraUser | null) => void;
  logout: () => void;
  setHydrating: (v: boolean) => void;
}

// The token is a plain, long-lived, reusable-until-invalidated string (see
// backend/src/utils/token.ts) — same as how Discord's own client persists
// its token in browser storage rather than memory-only. That's a deliberate
// tradeoff versus a stricter httpOnly-cookie approach: this token is
// readable by any JS running on the page (so an XSS bug becomes more
// costly), in exchange for behaving exactly like Discord's real token.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null,
  isHydrating: true,
  setToken: (token) => {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
    set({ token });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    set({ user: null, token: null });
  },
  setHydrating: (isHydrating) => set({ isHydrating }),
}));
