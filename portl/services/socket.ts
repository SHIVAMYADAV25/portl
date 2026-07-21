import { io, Socket } from "socket.io-client";
import { API_URL, getAccessToken } from "./api";

let socket: Socket | null = null;

export async function connectSocket(flatLabel?: string) {
  const token = await getAccessToken();
  if (!token) return null;

  if (socket?.connected) return socket;

  socket = io(API_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnectionDelay: 1500,
  });

  socket.on("connect", () => {
    if (flatLabel) socket?.emit("join-flat", flatLabel);
  });

  socket.on("connect_error", (err) => {
    // Non-fatal — the app works fine on polling/refresh if sockets can't connect
    // (e.g. no backend running in this environment, or a firewalled network).
    console.warn("[socket] connect_error:", err.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
