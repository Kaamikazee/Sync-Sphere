"use client";

import { getSocket } from "@/lib/socket"; // your singleton
import Image from "next/image";
import { useEffect, useState } from "react";

export interface UserTotal {
  userId: string;
  name: string;
  image: string;
  totalTime: number;
}

interface TimerEntry {
  userId: string;
  name: string;
  image: string;
  baseline: number;       // last “stopped” total
  startTime: number | null; // timestamp when they clicked Start, or null
}

interface Props {
  userId: string;
  groupId: string;
}

export default function TotalHours({ userId: sessionUserId, groupId }: Props) {
  const [timers, setTimers] = useState<Record<string, TimerEntry>>({});
  const [, tick] = useState(0); // dummy state to force re-render
  const socket = getSocket();

  // helper to format hh:mm:ss
  const formatHMS = (total: number) => {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
  };

  // 1) On mount: connect, join room, fetch initial, subscribe events
  useEffect(() => {
    socket.connect();
    socket.emit("joinGroup", groupId);
    socket.emit("getAllTotalHours", groupId);

    const onAll = (payload: UserTotal[]) => {
      const map: Record<string, TimerEntry> = {};
      payload.forEach(u => {
        map[u.userId] = {
          ...u,
          baseline: u.totalTime,
          startTime: null
        };
      });
      setTimers(map);
    };

    const onStart = (data: { userId: string; startTime: number; baseline: number }) => {
      setTimers(prev => ({
        ...prev,
        [data.userId]: {
          ...(prev[data.userId] || { userId: data.userId, name: "", image: "" }),
          baseline: data.baseline,
          startTime: data.startTime
        }
      }));
    };

    const onStop = (data: { userId: string; totalSeconds: number }) => {
      setTimers(prev => ({
        ...prev,
        [data.userId]: {
          ...(prev[data.userId] || {}),
          baseline: data.totalSeconds,
          startTime: null
        }
      }));
    };

    socket.on("allTotalHours", onAll);
    socket.on("activityStarted", onStart);
    socket.on("activityStopped", onStop);

    return () => {
      socket.emit("leaveGroup", groupId);
      socket.off("allTotalHours", onAll);
      socket.off("activityStarted", onStart);
      socket.off("activityStopped", onStop);
      socket.disconnect();
    };
  }, [groupId, socket]);

  // 2) One interval to force re-render every second
  useEffect(() => {
    const iv = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // render
  const entries = Object.values(timers);

  if (entries.length === 0) {
    return <p className="text-center py-4 italic text-gray-500">Loading…</p>;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Team Leaderboard</h2>
      <ul className="divide-y">
        {entries.map(({ userId, name, image, baseline, startTime }) => {
          const isMe = sessionUserId === userId;
          // compute live time
          const elapsed = startTime
            ? Math.floor((Date.now() - startTime) / 1000)
            : 0;
          const display = baseline + elapsed;

          return (
            <li
              key={userId}
              className={`flex items-center justify-between p-2 ${
                isMe ? "bg-blue-100 font-semibold" : ""
              }`}
            >
              {!isMe && (
                <Image
                  src={image}
                  alt={`${name}'s avatar`}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              )}
              <span>{isMe ? "You" : name}</span>
              <span>{formatHMS(display)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
