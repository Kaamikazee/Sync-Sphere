import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = (userId: string) => {
  if (!socket) {
    console.log("✅ Creating new socket for:", userId);
    socket = io("http://localhost:3001", {
      auth: { userId },
    });
  } else {
    console.log("⚠️ Reusing existing socket for:", userId);
  }
  return socket;
};
