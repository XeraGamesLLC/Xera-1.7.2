import axios from "axios";
import { useAuthStore } from "../store/auth";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// No refresh flow — the token doesn't expire on its own (see store/auth.ts),
// so a 401 here means it was actually invalidated (logout elsewhere,
// password reset) rather than "just needs renewing." Log out locally so the
// UI reflects that instead of silently retrying forever.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error ?? err.message ?? fallback;
  }
  return fallback;
}
