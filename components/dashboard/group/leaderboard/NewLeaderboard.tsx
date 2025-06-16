"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import io from "socket.io-client";

interface UserTimerData {
  id: string;
  name: string | null;
  image: string | null;
  dailyTotal: {
    totalSeconds: number;
  }[];
  isRunning?: boolean;
  startTimestamp?: number;
   totalSeconds: number; // ✅ NEW - flattened total
}

interface Props {
  groupId: string;
  uuserId: string;
  initialMembers: UserTimerData[];
}

const socket = io("http://localhost:3001");

export const NewLeaderboard = ({ groupId, uuserId, initialMembers }: Props) => {
  const [members, setMembers] = useState<UserTimerData[]>(
    initialMembers.map((m) => ({ ...m, isRunning: false, totalSeconds: m.dailyTotal?.[0]?.totalSeconds ?? 0 }))
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
                startTimestamp: undefined,
                 totalSeconds: totalSeconds ?? m.totalSeconds, //
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

  const getLiveTotalSeconds = (member: UserTimerData) => {
    const base =  member.totalSeconds ?? 0;
    if (member.isRunning && member.startTimestamp) {
      const elapsed = Math.floor((Date.now() - member.startTimestamp) / 1000);
      return base + elapsed;
    }
    return base;
  };

  const sorted = [...members].sort(
    (a, b) => getLiveTotalSeconds(b) - getLiveTotalSeconds(a)
  );

  return (
    <Card className="w-full max-w-3xl mx-auto mt-6 p-6 bg-white/20 backdrop-blur-md border border-white/20 shadow-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="text-3xl font-semibold text-center mb-4 text-black">
          Group Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((member, index) => (
          <div
            key={member.id}
            className="flex items-center justify-between bg-white/10 p-4 rounded-xl shadow-sm"
          >
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-black">#{index + 1}</span>
              <Avatar>
                <AvatarImage src={member.image!} />
                <AvatarFallback>{member.name}</AvatarFallback>
              </Avatar>
              <div className="text-black text-lg">{member.name}</div>
            </div>
            <div className="text-xl font-mono text-black">
              {formatHMS(getLiveTotalSeconds(member))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
