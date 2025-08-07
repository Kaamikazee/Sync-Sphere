"use client";

import { motion, useAnimation } from "framer-motion";
import Image from "next/image";
import { useRef, useState } from "react";
import { MessageWithSenderInfo } from "@/types/extended";

interface ChatMessageProps {
  msg: MessageWithSenderInfo;
  isOwn: boolean;
  isOnline: boolean;
  onReply: (msg: MessageWithSenderInfo) => void;
  userId: string;
}

export function ChatMessage({
  msg,
  isOwn,
  isOnline,
  onReply,
  userId,
}: ChatMessageProps) {
  const controls = useAnimation();
  const containerRef = useRef(null);
  const [showSeenModal, setShowSeenModal] = useState(false);

  console.log("MESSAGE VIES:", msg.views)
  const seenBy = msg.views?.filter((v) => v.id !== userId) || [];
  // console.log("SEEN BY:", seenBy);
  

  return (
    <motion.div
      ref={containerRef}
      drag="x"
      dragDirectionLock
      onDragEnd={(event, info) => {
        if (info.offset.x < -80) onReply(msg);
        controls.start({ x: 0 });
      }}
      animate={controls}
      dragConstraints={{ left: -120, right: 0 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} py-1 px-2 relative`}
    >
      {/* Sender avatar (only if not own message) */}
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

      {/* Message Bubble */}
      <div
        className={`rounded-xl px-3 py-2 text-sm shadow-sm max-w-[85%] sm:max-w-[75%] ${
          isOwn ? "bg-white text-black" : "bg-[#dcf8c6] text-black"
        }`}
      >
        {/* Sender Name (for others only) */}
        {!isOwn && (
          <p className="text-xs font-semibold mb-1">{msg.senderName}</p>
        )}

        {/* Reply Preview */}
        {msg.replyTo && (
          <div className="mb-1 px-2 py-1 bg-black/5 border-l-4 border-blue-500 text-xs italic text-gray-800 rounded-md">
            <strong>{msg.replyTo.senderName}</strong>:{" "}
            {msg.replyTo.content.slice(0, 40)}…
          </div>
        )}

        {/* Main Content */}
        <div className="whitespace-pre-wrap">{msg.content}</div>

        {/* Footer (timestamp and seen check) */}
        <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 mt-1">
          <span>
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {isOwn && seenBy.length > 0 && (
            <button
              onClick={() => setShowSeenModal(true)}
              className="hover:text-blue-500 transition-colors"
              title="Seen by"
            >
              ✔
            </button>
          )}
        </div>
      </div>

      {/* Seen By Modal */}
      {isOwn && showSeenModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full shadow-lg relative">
            <button
              onClick={() => setShowSeenModal(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
            >
              ✕
            </button>
            <h2 className="text-md font-semibold text-gray-800 mb-4">Seen By</h2>

            <div className="space-y-3 max-h-60 overflow-auto">
              {seenBy.length > 0 ? (
                seenBy.map((viewer) => (
                  <div key={viewer.id} className="flex items-center gap-3">
                    {viewer.image ? (
                      <Image
                        src={viewer.image}
                        alt={viewer.name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover w-8 h-8"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center">
                        {viewer.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {viewer.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Seen at{" "}
                        {new Date(viewer.seenAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No views yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
