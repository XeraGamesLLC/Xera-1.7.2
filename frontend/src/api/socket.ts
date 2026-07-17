import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "../store/auth";

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io("/", {
    auth: { token: useAuthStore.getState().accessToken },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

type Ack = { ok: true; data?: unknown } | { ok: false; error: string };

export function emitWithAck<T = unknown>(event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error("Socket not connected"));
    socket.emit(event, payload, (res: Ack) => {
      if (res?.ok) resolve(res.data as T);
      else reject(new Error(res?.error ?? "Request failed"));
    });
  });
}
