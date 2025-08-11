// lib/initSocket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

export function createSocket() {
  if (!socket) {
    socket = io(baseUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"], // ✅ Prefer WebSocket, allow fallback
      reconnection: true,
      reconnectionDelay: 1000, // optional: start retry after 1s
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });
  }
  return socket;
}

export function initSocket() {
  if (!socket) return createSocket();
  return socket;
}
