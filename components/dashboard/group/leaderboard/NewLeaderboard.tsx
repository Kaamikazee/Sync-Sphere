"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getSocket } from "@/lib/socket";

interface MemberWithTimer {
  id: string;
  name: string | null;
  image: string | null;
  totalSeconds: number;
  isRunning: boolean;
  startTimestamp: Date | null | string;
}

interface Props {
  uuserId: string;
  groupId: string;
}

export const NewLeaderboard = ({ uuserId, groupId }: Props) => {
  const [members, setMembers] = useState<MemberWithTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const socket = getSocket();

  useEffect(() => {
  const fetchMembers = async () => {
    setLoading(true);
    const res = await fetch(`/api/simple_timer/get?groupId=${groupId}`);
    const data = await res.json();

    const hydrated = data.map((m: { user: MemberWithTimer }) => {
      const user = m.user;
      return {
        ...user,
        startTimestamp: user.startTimestamp
          ? new Date(user.startTimestamp)
          : null,
      };
    });

    setMembers(hydrated);
    setLoading(false);
  };

  fetchMembers();
}, [groupId]);


  // 🔌 Join and leave socket group correctly
  useEffect(() => {
    const join = () => {
      console.log("Joining group:", groupId);
      socket.emit("joinGroup", { groupId, userId: uuserId });
    };

    if (socket.connected) {
      join();
    } else {
      socket.once("connect", join);
    }

    const handleStart = ({ userId, startTime }) => {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === userId
            ? { ...m, isRunning: true, startTimestamp: new Date(startTime) }
            : m
        )
      );
    };

    const handleStop = ({ userId, totalSeconds }) => {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === userId
            ? {
                ...m,
                isRunning: false,
                startTimestamp: null,
                totalSeconds,
              }
            : m
        )
      );
    };

    socket.on("timer-started", handleStart);
    socket.on("timer-stopped", handleStop);

    return () => {
      console.log("Leaving group:", groupId);
      socket.emit("leaveGroup", { groupId, userId: uuserId });
      socket.off("timer-started", handleStart);
      socket.off("timer-stopped", handleStop);
    };
  }, [groupId, uuserId]);

  // ⏱ Trigger re-render every second
  useEffect(() => {
    const tick = () => setMembers((prev) => [...prev]);
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [groupId]);

  const formatHMS = (total: number) => {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  };

  const getLiveTotalSeconds = (member: MemberWithTimer) => {
    const base = member.totalSeconds;
    if (member.isRunning && member.startTimestamp) {
      const elapsed =
        Math.floor(
          (Date.now() - new Date(member.startTimestamp).getTime()) / 1000
        ) || 0;
      return base + elapsed;
    }
    return base;
  };

  const sorted = [...members].sort(
    (a, b) => getLiveTotalSeconds(b) - getLiveTotalSeconds(a)
  );

  if (loading) {
  return (
    <div className="p-6 text-white text-center">Loading leaderboard...</div>
  );
}

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
                  src={member.image ?? "/default-avatar.png"}
                  alt={`${member.name ?? "User"} avatar`}
                  width={40}
                  height={40}
                  className="rounded-full ring-2 ring-white/50 size-10 hover:ring-white/80"
                />
                <span className="text-lg">{member.name ?? "Anonymous"}</span>
              </div>
              <span className="text-xl font-mono">
                {formatHMS(getLiveTotalSeconds(member))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
