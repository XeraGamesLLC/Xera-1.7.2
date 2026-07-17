import { create } from "zustand";

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
}

interface AuthState {
  user: XraUser | null;
  accessToken: string | null;
  isHydrating: boolean;
  setAccessToken: (token: string | null) => void;
  setUser: (user: XraUser | null) => void;
  logout: () => void;
  setHydrating: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isHydrating: true,
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  logout: () => set({ user: null, accessToken: null }),
  setHydrating: (isHydrating) => set({ isHydrating }),
}));
