"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { MemberComponent } from "./MemberComponent";
import { useQuery } from "@tanstack/react-query";

export interface MemberWithTimer {
  id: string;
  name: string | null;
  image: string | null;
  totalSeconds: number;
  isRunning: boolean;
  startTimestamp: Date | null | string;
  warningMessage: string | null;
  warningId: string | null;
}

interface Props {
  uuserId: string;
  groupId: string;
  uuserName?: string | null;
  groupName?: string;
}

export const NewLeaderboard = ({ uuserId, groupId, uuserName, groupName }: Props) => {
  const [members, setMembers] = useState<MemberWithTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const socket = getSocket();

  const fetchMembers = async () => {
    const res = await fetch(`/api/simple_timer/get?groupId=${groupId}`);
    const data = await res.json();
    return data.map((m: { user: MemberWithTimer }) => {
      const user = m.user;
      return {
        ...user,
        startTimestamp: user.startTimestamp
          ? new Date(user.startTimestamp)
          : null,
      };
    });
  };

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["groupMembers", groupId],
    queryFn: fetchMembers,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (membersData) setMembers(membersData);
    setLoading(isLoading);
  }, [membersData, isLoading]);



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

    const handleOnlineUsers = (ids: string[]) => setOnlineUserIds(ids);

    socket.on("timer-started", handleStart);
    socket.on("timer-stopped", handleStop);
    socket.on("online-users", handleOnlineUsers);

    return () => {
      console.log("Leaving group:", groupId);
      socket.emit("leaveGroup", { groupId, userId: uuserId });
      socket.off("timer-started", handleStart);
      socket.off("timer-stopped", handleStop);
      socket.off("online-users", handleOnlineUsers);
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
          {sorted.map((member, index) => {
            const base = formatHMS(getLiveTotalSeconds(member));
            const isOnline = onlineUserIds.includes(member.id);
            return (
              <li key={member.id}>
                <MemberComponent
                  name={member.name}
                  index={index}
                  image={member.image}
                  id={member.id}
                  base={base}
                  uusername={uuserName!}
                  groupName={groupName!}
                  warningMessage={member.warningMessage}
                  groupId={groupId}
                  warningId={member.warningId}
                  isOnline={isOnline}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
