"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
// import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

interface UserTotal {
  userId: string;
  name: string;
  image: string;
  totalTime: number;
}

interface Props {
  userId: string;
  groupId: string;
}

export default function Leaderboard({ userId: sessionUserId, groupId }: Props) {
  //   const { data: session } = useSession();
  const [totals, setTotals] = useState<UserTotal[]>([]);
  const [socket, setSocket] = useState<Socket>();

  useEffect(() => {
    const sock = io("http://localhost:3001"); // or your URL
    setSocket(sock);

    sock.on("allTotals", (payload: UserTotal[]) => {
      setTotals(payload);
    });

    sock.on("connect", () => {
      sock.emit("getAllTotals");
    });

    return () => {
      sock.disconnect();
    };
  }, []);

  // whenever someone updates a timer, you could re-fetch:
  useEffect(() => {
    if (!socket) return;
    socket.on("timerUpdated", () => {
      socket.emit("getAllTotals", groupId);
    });
  }, [socket, groupId]);

  function formatHMS(total: number) {
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return [h, m, s]
      .map((n) => String(n).padStart(2, "0"))
      .join(":")
  }

   return (
    <div className="p-6 bg-gradient-to-br from-purple-500/30 via-blue-400/30 to-indigo-500/30 backdrop-blur-md border border-white/20 shadow-lg flex justify-center hover:shadow-2xl hover:scale-105 transition-transform duration-300
">
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-3xl font-extrabold text-white mb-2 text-center">
          Team Leaderboard
        </h2>
        <ul className="divide-y divide-white/30 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md bg-white/10 border border-white/20">
          {totals.map(({ userId, totalTime, name, image }) => {
            const isMe = sessionUserId === userId
            return (
              <li
                key={userId}
                className={`
                  flex items-center justify-between p-4 hover:scale-105 transition-colors duration-300
                  ${isMe
                    ? "bg-white/30 font-semibold text-white"
                    : "hover:bg-white/10 text-white/90"}
                `}
              >
                <div className="flex items-center space-x-3">
                  {!isMe && (
                    <Image
                      className="w-10 h-10 rounded-full ring-2 ring-white/50"
                      src={image}
                      alt={`${name} avatar`}
                      width={40}
                      height={40}
                    />
                  )}
                  <span>{isMe ? "You" : name}</span>
                </div>
                <span className="font-mono">{formatHMS(totalTime)}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
