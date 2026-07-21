import type { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyToken } from "./utils/jwt";

let io: Server | null = null;

// Track which sockets belong to which user, so we can target a specific resident/guard.
const userSockets = new Map<string, Set<string>>();

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token"));
    try {
      const payload = verifyToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user?.sub as string;
    if (userId) {
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId)!.add(socket.id);
    }

    // Everyone can join a "flat room" (residents of that flat) or "guards" room.
    const { role, sub } = socket.data.user;
    if (role === "guard") socket.join("guards");
    if (role === "admin") socket.join("admins");
    socket.join(`user:${sub}`);

    socket.on("join-flat", (flatLabel: string) => {
      socket.join(`flat:${flatLabel}`);
    });

    socket.on("disconnect", () => {
      userSockets.get(userId)?.delete(socket.id);
    });
  });

  return io;
}

export function getIo() {
  if (!io) throw new Error("Socket.IO not initialized — call initSocket() first");
  return io;
}

// Convenience emitters matching the PRD's real-time event catalogue.
export const socketEvents = {
  visitorRequest: (flatLabel: string, visitor: unknown) =>
    getIo().to(`flat:${flatLabel}`).emit("visitor-request", visitor),
  visitorApproved: (visitor: unknown) => getIo().to("guards").emit("visitor-approved", visitor),
  visitorRejected: (visitor: unknown) => getIo().to("guards").emit("visitor-rejected", visitor),
  visitorEntered: (flatLabel: string, visitor: unknown) =>
    getIo().to(`flat:${flatLabel}`).emit("visitor-entered", visitor),
  visitorExited: (flatLabel: string, visitor: unknown) =>
    getIo().to(`flat:${flatLabel}`).emit("visitor-exited", visitor),
  newNotice: (notice: unknown) => getIo().emit("new-notice", notice),
  newPoll: (poll: unknown) => getIo().emit("new-poll", poll),
  ticketUpdated: (complaint: unknown) => getIo().emit("ticket-updated", complaint),
};
