import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';

export const initSocket = (userId: string) => {
  if (!socket) {
    console.log("✅ Creating new socket for:", userId);
    socket = io(baseUrl, {
      auth: { userId },
    });
  } else {
    console.log("⚠️ Reusing existing socket for:", userId);
  }
  return socket;
};
