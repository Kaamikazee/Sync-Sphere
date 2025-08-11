"use client";

import { getSocket } from "@/lib/socket";
// import { getSocket } from "@/lib/socket";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  groupId: string;
  chatId: string;
  userId: string;
}


export const ChatButton = ({ chatId, groupId, userId }: Props) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const socket = getSocket();

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
    <Link href={`${groupId}/chat`}>
      <div className="relative px-6 py-2 bg-gradient-to-r from-cyan-500/40 via-sky-500/30 to-indigo-600/40 hover:bg-gradient-to-r hover:from-cyan-400/40 hover:via-sky-400/30 hover:to-indigo-500/40 text-white rounded-full shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer">
        Chat Room
        {unreadCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs
                w-5 h-5 rounded-full flex items-center justify-center font-semibold shadow"
          >
            {unreadCount > 900 ? "900+" : unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
};
