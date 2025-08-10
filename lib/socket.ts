// // lib/socket.ts
// import { io, Socket } from "socket.io-client";

// let socket: Socket | null = null;
// const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

// export const getSocket = (): Socket => {
//   if (!socket) {
//     socket = io(baseUrl, {
//       transports: ["websocket"],
//     });
//   }
//   return socket;
// };
