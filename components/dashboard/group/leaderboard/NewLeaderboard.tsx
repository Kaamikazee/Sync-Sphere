"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import io from "socket.io-client";
import Image from "next/image";


interface MemberWithTimer {
  id: string;
  name: string | null;
  image: string | null;
  totalSeconds: number;
  isRunning: boolean;
  startTimestamp: Date | null;
}

interface Props {
  initialMembers: MemberWithTimer[];
  uuserId: string;
  groupId: string;
}

const socket = io("http://localhost:3001");

export const NewLeaderboard = ({ initialMembers, uuserId, groupId}: Props) => {
  const [members, setMembers] = useState<MemberWithTimer[]>(
    initialMembers
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    socket.emit("join-group", { groupId, userId: uuserId });

    socket.on("timer-started", ({ userId, startTime }) => {
      console.log("CLIENT TIMER-STARTED", startTime);

      setMembers((prev) =>
        prev.map((m) =>
          m.id === userId
            ? { ...m, isRunning: true, startTimestamp: startTime }
            : m
        )
      );
    });

    socket.on("timer-stopped", ({ userId, totalSeconds }) => {
  console.log("CLIENT TIMER-STOPPED", totalSeconds);

  setMembers((prev) =>
    prev.map((m) =>
      m.id === userId
        ? {
            ...m,
            isRunning: false,
            startTimestamp: null, // 👈 instead of undefined (since it's `Date | null`)
            totalSeconds: totalSeconds, // 👈 no need for fallback anymore
          }
        : m
    )
  );
});


    return () => {
      socket.off("timer-started");
      socket.off("timer-stopped");
    };
  }, [groupId, uuserId]);

  useEffect(() => {
    const tick = () => setMembers((prev) => [...prev]);
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatHMS = (total: number) => {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  };

  const getLiveTotalSeconds = (member: MemberWithTimer) => {
    const base =  member.totalSeconds;
    if (member.isRunning && member.startTimestamp) {
      const elapsed = Math.floor((Date.now() - new Date(member.startTimestamp).getTime()) / 1000);
      return base + elapsed;
    }
    return base;
  };

  const sorted = [...members].sort(
    (a, b) => getLiveTotalSeconds(b) - getLiveTotalSeconds(a)
  );

  return (
  <div className="p-6 bg-gradient-to-br from-purple-500/30 via-blue-400/30 to-indigo-500/30 backdrop-blur-md border border-white/20 shadow-lg flex justify-center hover:shadow-2xl hover:scale-105 transition-transform duration-300">
    <div className="w-full max-w-3xl space-y-4">
      <h2 className="text-3xl font-extrabold text-white mb-2 text-center">
        Group Leaderboard
      </h2>
      <ul className="divide-y divide-white/30 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md bg-white/10 border border-white/20">
        {sorted.map((member, index) => (
          <li
            key={member.id}
            className="flex items-center justify-between py-4 px-6 hover:scale-105 transition-all duration-300 text-white/90
             hover:bg-white/10 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:ring-2 hover:ring-white/30
             rounded-xl"
          >
            <div className="flex items-center space-x-4">
              <span className="text-xl font-bold text-white">#{index + 1}</span>
              <Image
                src={member.image!}
                alt={`${member.name} avatar`}
                width={40}
                height={40}
                className="rounded-full ring-2 ring-white/50 size-10 hover:ring-white/80"
              />
              <span className="text-lg">{member.name}</span>
            </div>
            <span className="text-xl font-mono">{formatHMS(getLiveTotalSeconds(member))}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);
};
