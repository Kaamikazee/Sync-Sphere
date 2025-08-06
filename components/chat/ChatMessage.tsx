// eslint-disable-next-line @typescript-eslint/no-require-imports
// components/chat/ChatMessage.tsx

"use client";

import { motion, useAnimation } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { MessageWithSenderInfo } from "@/types/extended";
import { io, Socket } from "socket.io-client";

interface ChatMessageProps {
  msg: MessageWithSenderInfo;
  isOwn: boolean;
  isOnline: boolean;
  onReply: (msg: MessageWithSenderInfo) => void;
}

let socket: Socket | null = null;

const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

function useSocket() {
  useEffect(() => {
    if (!socket) {
      socket = io(baseUrl);
    }
  }, []);
}

export function ChatMessage({
  msg,
  isOwn,
  isOnline,
  onReply,
}: ChatMessageProps) {
  const controls = useAnimation();
    const containerRef = useRef(null);
  useSocket();
  const messageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!messageRef.current || isOwn) return;

    const element = messageRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            socket?.emit("message:seen", {
              messageId: msg.id,
              groupId: msg.groupId,
            });
          }
        });
      },
      { threshold: 1.0 }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [msg.id, msg.groupId, isOwn]);

  return (
    <motion.div
      ref={containerRef}
       data-id={msg.id}
      drag="x"
      dragDirectionLock
      onDragEnd={(event, info) => {
        if (info.offset.x < -80) {
          onReply(msg);
        }
        controls.start({ x: 0 }); // always snap back
      }}
      animate={controls}
      dragConstraints={{ left: -120, right: 0 }}
      className={`flex ${
        isOwn ? "justify-end" : "justify-start"
      } py-1 px-2 relative`}
    >
      {!isOwn && (
        <div className="relative w-7 h-7 sm:w-8 sm:h-8 mr-2 shrink-0">
          {msg.senderImage ? (
            <Image
              src={msg.senderImage}
              alt="pfp"
              width={32}
              height={32}
              className="rounded-full object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-xs sm:text-sm font-bold text-white">
              {msg.senderName?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>
      )}
      <div
        className={`rounded-xl px-3 py-2 text-sm shadow-sm max-w-[85%] sm:max-w-[75%] ${
          isOwn ? "bg-white text-black" : "bg-[#dcf8c6] text-black"
        }`}
      >
        {!isOwn && (
          <p className="text-xs font-semibold mb-1">{msg.senderName}</p>
        )}
        {msg.replyTo && (
          <div className="mb-1 px-2 py-1 bg-black/5 border-l-4 border-blue-500 text-xs italic text-gray-800 rounded-md">
            <strong>{msg.replyTo.senderName}</strong>:{" "}
            {msg.replyTo.content.slice(0, 40)}…
          </div>
        )}

        {/* {isOwn && msg.seenBy.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 text-right">
            Seen by {msg.seenBy.map((entry: any) => entry.user.name).join(", ")}
          </p>
        )} */}

        {isOwn && Array.isArray(msg.seenBy) && msg.seenBy.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 text-right">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            Seen by {msg.seenBy.map((entry: any) => entry.user.name).join(", ")}
          </p>
        )}

        <div className="whitespace-pre-wrap">{msg.content}</div>
        <div className="text-[10px] text-gray-500 text-right mt-1">
          {new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </motion.div>
  );
}
