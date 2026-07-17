import axios from "axios";
import { useAuthStore } from "../store/auth";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // sends the httpOnly refresh cookie
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
    const token = res.data.accessToken as string;
    useAuthStore.getState().setAccessToken(token);
    return token;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
}

// Single entry point for every refresh — deduped so concurrent callers (a
// 401-triggered retry racing the initial page-load hydration, React 18
// StrictMode's double-effect in dev, multiple tabs, etc.) share one in-flight
// request instead of each presenting the httpOnly refresh cookie separately.
// That matters because the backend rotates the refresh token on every use
// and treats a second presentation of an already-rotated token as theft,
// revoking *every* session for the user — so two concurrent refresh calls
// must never actually hit the network as two separate requests.
export function requestTokenRefresh(): Promise<string | null> {
  if (!refreshPromise) refreshPromise = refreshAccessToken().finally(() => (refreshPromise = null));
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const token = await requestTokenRefresh();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
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
