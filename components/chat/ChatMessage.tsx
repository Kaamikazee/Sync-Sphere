/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import Image from "next/image";
import { createPortal } from "react-dom";
import { MessageWithSenderInfo } from "@/types/extended";
// IMPORTANT: import the exact same socket export that ChatContainer uses.
// Make sure this file and ChatContainer import from the same module path.
// import { initSocket } from "@/lib/useSocket"; // <- ensure this is the canonical socket module

interface ChatMessageProps {
  msg: MessageWithSenderInfo;
  isOwn: boolean;
  isOnline: boolean;
  onReply: (msg: MessageWithSenderInfo) => void;
  userId: string;
  openSeenModal: (MessageId: string) => void;
}

function ChatMessageInner({
  msg,
  isOwn,
  isOnline,
  onReply,
  userId,
  openSeenModal,
}: ChatMessageProps) {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showSeenModal, setShowSeenModal] = useState(false);


  // viewers fetched from server when modal opens (has seenAt)
  const viewersFromMsg = useMemo(() => {
    // prefer server-provided seenPreview (already shaped), else derive from msg.views
    if (
      Array.isArray((msg as any).seenPreview) &&
      (msg as any).seenPreview.length > 0
    ) {
      return (msg as any).seenPreview.map((v: any) => ({
        id: v.id,
        name: v.name,
        image: v.image ?? null,
        seenAt: v.seenAt ?? null,
      }));
    }

    if (Array.isArray((msg as any).views) && (msg as any).views.length > 0) {
      return (msg as any).views
        .map((v: any) =>
          v.user
            ? {
                id: v.user.id,
                name: v.user.name,
                image: v.user.image ?? null,
                seenAt: v.seenAt ?? null,
              }
            : {
                id: v.id ?? v.userId,
                name: v.name ?? "",
                image: v.image ?? null,
                seenAt: v.seenAt ?? null,
              }
        )
        .filter((v: any) => v.id !== userId);
    }

    return [];
  }, [msg, userId]);

  // Quick preview: prefer server-provided seenPreview
  const quickPreview = viewersFromMsg.slice(0, 3);
  const seenCount =
    typeof (msg as any).seenCount === "number"
      ? (msg as any).seenCount
      : quickPreview.length;

  // Open modal and request viewers; ensure the emit reaches server even if socket is not connected.
  const handleOpenSeenModal = () => {
    try {
      openSeenModal(msg.id);
    } catch (err) {
      console.warn("openSeenModal failed:", err);
    }
    setShowSeenModal(true);
  };

  const handleDragEnd = (event: any, info: any) => {
    if ((!isOwn && info.offset.x < -80) || (isOwn && info.offset.x > 80)) {
      onReply(msg);
    }
    controls.start({ x: 0 });
  };

  const canPortal = typeof window !== "undefined" && !!document?.body;

  return (
    <motion.div
      ref={containerRef}
      drag="x"
      dragDirectionLock
      onDragEnd={handleDragEnd}
      animate={controls}
      dragConstraints={
        isOwn ? { left: 0, right: 120 } : { left: -120, right: 0 }
      }
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
              unoptimized
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
        className={`rounded-xl px-3 py-2 text-sm shadow-sm max-w-[85%] sm:max-w-[75%] break-words ${
          isOwn ? "bg-white text-black" : "bg-[#dcf8c6] text-black"
        }`}
      >
        {!isOwn && (
          <p className="text-xs font-semibold mb-1">{msg.senderName}</p>
        )}

        {msg.replyTo && (
          <div className="mb-1 px-2 py-1 bg-black/5 border-l-4 border-blue-500 text-xs italic text-gray-800 rounded-md">
            <strong>{msg.replyTo.senderName}</strong>:{" "}
            {String(msg.replyTo.content).slice(0, 40)}…
          </div>
        )}

        <div className="whitespace-pre-wrap">{msg.content}</div>

        <div className="flex items-center justify-end gap-2 text-[10px] text-gray-500 mt-1">
          <span>
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {isOwn && seenCount > 0 && (
            <button
              onClick={handleOpenSeenModal}
              className="hover:text-blue-500 transition-colors flex items-center gap-1"
              title={`Seen by ${seenCount}+`}
              aria-label={`Open seen by (${seenCount})`}
            >
              <span>✔</span>
              <span className="text-[9px] text-gray-400">{seenCount}</span>
            </button>
          )}
        </div>
      </div>

      {isOwn &&
        showSeenModal &&
        canPortal &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowSeenModal(false)}
          >
            <div
              className="bg-white rounded-xl p-4 max-w-sm w-full shadow-lg relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowSeenModal(false)}
                className="absolute top-2 right-2 text-gray-600 hover:text-black"
                aria-label="Close seen by modal"
              >
                ✕
              </button>
              <h2 className="text-md font-semibold text-gray-800 mb-4">
                Seen By {seenCount}
              </h2>

              <div className="space-y-3 max-h-60 overflow-auto">
                {viewersFromMsg.length > 0 ? (
                  viewersFromMsg.map((viewer:any) => (
                    <div key={viewer.id} className="flex items-center gap-3">
                      {viewer.image ? (
                        <Image
                          src={viewer.image}
                          alt={viewer.name}
                          width={32}
                          height={32}
                          className="rounded-full object-cover w-8 h-8"
                          unoptimized
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
                          {viewer.seenAt
                            ? `Seen at ${new Date(
                                viewer.seenAt
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : "Seen"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No views yet.</p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </motion.div>
  );
}

export const ChatMessage = ChatMessageInner;
