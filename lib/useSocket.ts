// lib/useSocket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

export function createSocket() {
  if (!socket) {
    socket = io(baseUrl, {
      autoConnect: false,           // important: don't connect at import time
      // transports: ["websocket"], // remove unless you need it
      reconnection: true,
    });
  }
  return socket;
}

export function useSocket() {
  if (!socket) return createSocket();
  return socket;
}
