"use client";

import { useEffect, useRef, useState } from "react";
import { MemberComponent } from "./MemberComponent";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { UserPermission } from "@prisma/client";
import { getSocket } from "@/lib/socket";

export interface MemberWithTimer {
  id: string;
  name: string | null;
  image: string | null;
  totalSeconds: number; // base stored seconds (not including elapsed)
  isRunning: boolean;
  startTimestamp: Date | null | string;
  warningMessage: string | null;
  warningId: string | null;
  Role: UserPermission;
}

interface Props {
  uuserId: string;
  groupId: string;
  uuserName?: string | null;
  groupName?: string;
  sessionUserRole?: UserPermission;
}

export const NewLeaderboard = ({
  uuserId,
  groupId,
  uuserName,
  groupName,
  sessionUserRole = "READ_ONLY",
}: Props) => {
  const [members, setMembers] = useState<MemberWithTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const socket = getSocket();

  const normalizedUserId = String(uuserId).trim();
  const normalizedGroupId = String(groupId).trim();

  const fetchMembers = async () => {
    const res = await fetch(`/api/simple_timer/get?groupId=${encodeURIComponent(groupId)}`);
    const data = await res.json();
    return data.map((m: { user: MemberWithTimer }) => {
      const user = m.user;
      return {
        ...user,
        startTimestamp: user.startTimestamp ? new Date(user.startTimestamp) : null,
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

  // Join and socket handlers
  useEffect(() => {
    if (!socket) return;

    const join = () => {
      socket.emit("joinGroup", { groupId: normalizedGroupId, userId: normalizedUserId });
      // immediately ask server for current online users for fast UI
      socket.emit("get-online-users", { groupId: normalizedGroupId });
      console.log("joinGroup emitted", normalizedGroupId, normalizedUserId);
    };

    const onConnect = () => join();

    if (socket.connected) {
      join();
    } else {
      socket.once("connect", onConnect);
    }

    // Handlers
    const handleStart = ({
      userId,
      startTime,
    }: {
      userId: string;
      startTime: string | number | Date;
    }) => {
      const uid = String(userId).trim();
      setMembers((prev) =>
        prev.map((m) =>
          m.id === uid
            ? { ...m, isRunning: true, startTimestamp: startTime ? new Date(startTime) : null }
            : m
        )
      );
    };

    const handleStop = ({
      userId,
      totalSeconds,
    }: {
      userId: string;
      totalSeconds: number;
    }) => {
      const uid = String(userId).trim();
      setMembers((prev) =>
        prev.map((m) =>
          m.id === uid
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

    const handleOnlineUsers = (ids: string[]) => {
      setOnlineUserIds(ids.map((id) => String(id).trim()));
    };

    // Lightweight per-second server-provided tick (authoritative per-second)
    const handleTick = ({
      userId,
      currentTotalSeconds,
    }: {
      userId: string;
      currentTotalSeconds: number;
      activeFocusAreaId?: string | null;
    }) => {
      const uid = String(userId).trim();
      setMembers((prev) =>
        prev.map((m) =>
          m.id === uid
            ? {
                ...m,
                // keep isRunning/startTimestamp as-is (server tick is just an update to base)
                totalSeconds: currentTotalSeconds,
              }
            : m
        )
      );
    };

    // Authoritative update from DB/routes (replace base + running state)
    const handleUpdated = (payload: {
      userId: string;
      isRunning: boolean;
      totalSeconds: number;
      startTime?: string | number | null;
      activeFocusAreaId?: string | null;
    }) => {
      const uid = String(payload.userId).trim();
      setMembers((prev) =>
        prev.map((m) =>
          m.id === uid
            ? {
                ...m,
                isRunning: !!payload.isRunning,
                totalSeconds: payload.totalSeconds,
                startTimestamp: payload.startTime ? new Date(payload.startTime) : null,
              }
            : m
        )
      );
    };

    // Register listeners
    socket.on("timer-started", handleStart);
    socket.on("timer-stopped", handleStop);
    socket.on("online-users", handleOnlineUsers);
    socket.on("timer-tick", handleTick);
    socket.on("timer:updated", handleUpdated);

    // cleanup
    return () => {
      try {
        socket.emit("leaveGroup", { groupId: normalizedGroupId, userId: normalizedUserId });
      } catch {
        // ignore if socket is disconnected
      }
      socket.off("timer-started", handleStart);
      socket.off("timer-stopped", handleStop);
      socket.off("online-users", handleOnlineUsers);
      socket.off("timer-tick", handleTick);
      socket.off("timer:updated", handleUpdated);
      socket.off("connect", onConnect);
    };
  }, [groupId, uuserId, socket, normalizedGroupId, normalizedUserId]);

  // Efficient per-second re-render: only recreate objects for running members so getLiveTotalSeconds updates
  useEffect(() => {
    const tick = () =>
      setMembers((prev) =>
        prev.map((m) => {
          if (!m.isRunning || !m.startTimestamp) return m; // keep identity if unchanged
          return { ...m }; // shallow copy to trigger re-render and let getLiveTotalSeconds compute elapsed
        })
      );

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="p-6 space-y-3 animate-pulse"
      >
        <div className="p-6 space-y-3 animate-pulse">
          <div className="h-6 w-1/2 bg-white/20 rounded-lg mx-auto" />
          <div className="space-y-2 max-w-3xl mx-auto mt-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 bg-white/10 rounded-xl border border-white/10"
              >
                <div className="w-10 h-10 rounded-full bg-white/20" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 bg-white/20 rounded" />
                  <div className="h-3 w-1/3 bg-white/10 rounded" />
                </div>
                <div className="h-4 w-12 bg-white/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className="p-2 sm:p-6 bg-purple-500/10 sm:bg-gradient-to-br sm:from-purple-500/30 sm:via-blue-400/30 sm:to-indigo-500/30 
    backdrop-blur-none sm:backdrop-blur-md 
    border border-white/20 shadow-md sm:shadow-lg 
    transition-transform duration-300 
    sm:hover:shadow-2xl sm:hover:scale-105 rounded-xl "
    >
      <div className="w-full max-w-3xl space-y-3 sm:space-y-4 mx-auto">
        <h2 className="text-lg sm:text-3xl font-extrabold text-[#5b3e96] mb-2 text-center">
          {groupName} Leaderboard
        </h2>
        <ul
          className="divide-y divide-white/20 rounded-xl sm:rounded-2xl overflow-hidden 
        shadow-md sm:shadow-2xl 
        bg-white/5 sm:bg-white/10 
        border border-white/20 
        backdrop-blur-none sm:backdrop-blur-md"
        >
          {sorted.map((member, index) => {
            const isMe = member.id === normalizedUserId;
            const base = formatHMS(getLiveTotalSeconds(member));
            const isOnline = onlineUserIds.includes(String(member.id).trim());
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
                  isMe={isMe}
                  role={sessionUserRole}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
