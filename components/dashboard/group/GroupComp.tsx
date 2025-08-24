"use client";

import { MessageCircle, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { groupsWithUserNameAndRole } from "@/lib/api";
// import { initSocket } from "@/lib/initSocket";
import { getSocket } from "@/lib/socket";

interface Props {
  group: groupsWithUserNameAndRole;
  href: string;
  SessionUserId: string;
}

// const socket = initSocket();

export default function GroupComp({
  group: { id, image, name, createdAt, creatorName, isPrivate, chatId },
  SessionUserId: userId,
  href,
}: Props) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const socket = useMemo(() => getSocket(), []);
  // console.log("UNREAD COUNT:", unreadCount);

  // 2. Join unread room on mount
  useEffect(() => {
    if (!socket || !chatId) return;

    socket.emit("joinUnreadRoom", { chatId, userId });
    socket.emit("getUnreadCount", { chatId, userId });
  }, [chatId, userId, socket]);

  // 3. Handle incoming unread count updates
  useEffect(() => {
    if (!socket) return;

    const handler = ({
      chatId: incomingChatId,
      unreadCount,
    }: {
      chatId: string;
      userId: string;
      unreadCount: number;
    }) => {
      if (incomingChatId === chatId) {
        setUnreadCount(unreadCount);
      }
    };

    socket.on("chat:updateUnreadCount", handler);
    return () => {
      socket.off("chat:updateUnreadCount", handler);
    };
  }, [chatId, socket]);

  return (
    <Link href={`${href}/${id}`}>
      <div
        className="cursor-pointer rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 
                 p-4 sm:p-5 shadow-lg hover:scale-[1.02] hover:shadow-2xl transition"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: Avatar + Name + Info */}
          <div className="flex items-start gap-4 min-w-0">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-white/30 bg-white/10 shrink-0">
              {image ? (
                <Image src={image} alt={name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white font-bold text-xl">
                  {name?.[0] || "G"}
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-white text-base sm:text-lg font-semibold flex items-center gap-1 whitespace-nowrap truncate">
                {name}
                {isPrivate && <Lock size={14} className="text-white/70" />}
              </span>
              <div className="flex gap-4 text-xs sm:text-sm mt-1 whitespace-nowrap">
                <span className="text-white/90 truncate max-w-[120px] sm:max-w-[160px]">
                  {creatorName}
                </span>
                <span className="text-white/80 font-mono truncate">
                  {format(createdAt, "dd-MM-yy")}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Chat Icon + Unread Badge */}
          <Link href={`/dashboard/groups/${id}/chat`} className="relative">
            <button
              className="p-2 rounded-full hover:bg-white/20 transition relative"
              title="Go to Chat"
            >
              <MessageCircle className="text-white" size={20} />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs
                  w-5 h-5 rounded-full flex items-center justify-center font-semibold shadow"
                >
                  {unreadCount > 900 ? "900+" : unreadCount}
                </span>
              )}
            </button>
          </Link>
        </div>
      </div>
    </Link>
  );
}
