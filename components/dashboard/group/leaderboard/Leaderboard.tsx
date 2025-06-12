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
            const h = Math.floor(total / 3600);
            const m = Math.floor((total % 3600) / 60);
            const s = total % 60;
            return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
          }

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Team Leaderboard</h2>
      <ul className="divide-y">
        {totals.map(({ userId, totalTime, name, image }) => {
          const isMe = sessionUserId === userId;
          
          return (
            <li
              key={userId}
              className={`p-2 flex justify-between items-center
                ${isMe ? "bg-blue-100 font-medium" : ""}`}
            >
            <span className="rounded-full">
                {!isMe && <Image className="rounded-full" src={image} alt="pfp" width={50} height={50} />}
            </span>
              <span>{isMe ? "You" : name}</span>
              <span>
               {formatHMS(totalTime)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
