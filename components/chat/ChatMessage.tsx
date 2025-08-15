/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useAnimation,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import Image from "next/image";
import { createPortal } from "react-dom";
import { MessageWithSenderInfo } from "@/types/extended";
import { SeenButton } from "./SeenButton";

interface MutedUser {
  userId: string;
  expiresAt?: string | null;
}

interface ChatMessageProps {
  msg: MessageWithSenderInfo;
  isOwn: boolean;
  isOnline: boolean;
  onReply: (msg: MessageWithSenderInfo) => void;
  userId: string;
  openSeenModal: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => void;
  registerRef?: (id: string, el: HTMLDivElement | null) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;

  /* NEW */
  socket?: any; // socket.io client instance
  groupId?: string;
  currentUserRole?: string; // "OWNER" | "ADMIN" | "MEMBER"
  mutedUsers?: MutedUser[]; // list from ChatContainer
}

function ChatMessageInner({
  msg,
  isOwn,
  isOnline,
  onReply,
  userId,
  openSeenModal,
  onJumpToMessage,
  registerRef,
  onEdit,
  onDelete,
  onToggleReaction,

  /* NEW */
  socket,
  groupId,
  currentUserRole,
  mutedUsers = [],
}: ChatMessageProps) {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [showSeenModal, setShowSeenModal] = useState(false);

  // editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content ?? "");
  // Popover state
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [popoverPreferBelow, setPopoverPreferBelow] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setEditText(msg.content ?? "");
  }, [msg.content]);

  useEffect(() => {
    registerRef?.(msg.id, containerRef.current ?? null);
    return () => registerRef?.(msg.id, null);
  }, [msg.id, registerRef]);

  // ----- NEW: muted helpers -----
  const isSenderMuted = useMemo(() => {
    return mutedUsers.some((m) => m.userId === msg.senderId);
  }, [mutedUsers, msg.senderId]);

  const senderMuteInfo = useMemo(
    () => mutedUsers.find((m) => m.userId === msg.senderId) ?? null,
    [mutedUsers, msg.senderId]
  );

  // current user permission to mute/unmute others
  const canMuteOthers = useMemo(() => {
    if (!currentUserRole) return false;
    return currentUserRole === "ADMIN" || currentUserRole === "OWNER";
  }, [currentUserRole]);

  const isTargetOwner = (msg as any).senderRole === "OWNER"; // optional if you pass senderRole in msg
  const canActOnTarget = useMemo(() => {
    // cannot mute/unmute yourself; only admins/owners can mute others
    if (!canMuteOthers) return false;
    if (msg.senderId === userId) return false;
    // optionally protect owner: only owner can act on owner (require actor be OWNER)
    if (isTargetOwner && currentUserRole !== "OWNER") return false;
    return true;
  }, [canMuteOthers, msg.senderId, userId, isTargetOwner, currentUserRole]);

  useEffect(() => {
    if (!popoverOpen) return;

    const handleClickOutside = (event: Event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [popoverOpen]);

  // only the message sender may edit
  const canEdit = isOwn;

  // delete allowed for sender, or admins/owners
  const canDelete =
    isOwn || currentUserRole === "ADMIN" || currentUserRole === "OWNER";

  // ----- Mute/unmute handlers -----
  const handleMute = (durationSeconds?: number) => {
    if (!socket || !groupId) {
      window.alert("Unable to mute: missing socket or groupId");
      return;
    }
    socket.emit("muteUser", {
      targetUserId: msg.senderId,
      groupId,
      durationSeconds,
      reason: "Muted via chat UI",
    });
    setPopoverOpen(false);
  };

  const handleUnmute = () => {
    if (!socket || !groupId) {
      window.alert("Unable to unmute: missing socket or groupId");
      return;
    }
    socket.emit("unmuteUser", { targetUserId: msg.senderId, groupId });
    setPopoverOpen(false);
  };

  // ... rest of your existing code (viewersFromMsg, reactions, etc.) ...
  // I'll keep your existing viewers/reactions logic unchanged.

  // derive viewers (unchanged)
  const viewersFromMsg = useMemo(() => {
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

  const quickPreview = viewersFromMsg.slice(0, 3);
  const seenCount =
    typeof (msg as any).seenCount === "number"
      ? (msg as any).seenCount
      : quickPreview.length;

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

  // Save edited content
  const saveEdit = () => {
    const trimmed = (editText ?? "").trim();
    if (!trimmed) return;
    onEdit?.(msg.id, trimmed);
    setIsEditing(false);
  };

  // Confirm delete
  const confirmDelete = () => {
    const ok = window.confirm("Delete this message? This cannot be undone.");
    if (!ok) return;
    onDelete?.(msg.id);
    setPopoverOpen(false);
  };

  // ===== Reaction helpers =====
  const reactions: any[] = useMemo(
    () => (Array.isArray((msg as any).reactions) ? (msg as any).reactions : []),
    [msg]
  );
  const reactionSummary = Array.isArray((msg as any).reactionSummary)
    ? (msg as any).reactionSummary
    : undefined;

  const computedSummary = useMemo(() => {
    if (reactionSummary) return reactionSummary;
    const map = new Map<
      string,
      { emoji: string; count: number; reactedByMe: boolean; sampleUsers: any[] }
    >();
    for (const r of reactions) {
      const e = r.emoji;
      const entry = map.get(e) || {
        emoji: e,
        count: 0,
        reactedByMe: false,
        sampleUsers: [] as any[],
      };
      entry.count += 1;
      if (r.user && r.user.id === userId) entry.reactedByMe = true;
      if (r.user)
        entry.sampleUsers.push({
          id: r.user.id,
          name: r.user.name,
          image: r.user.image ?? null,
        });
      map.set(e, entry);
    }
    return Array.from(map.values()).map((v) => ({
      ...v,
      sampleUsers: v.sampleUsers.slice(0, 3),
    }));
  }, [reactions, reactionSummary, userId]);

  const reactionGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        emoji: string;
        users: { id: string; name: string; image?: string | null }[];
      }
    >();
    for (const r of reactions) {
      const e = r.emoji;
      const list = map.get(e) || { emoji: e, users: [] as any[] };
      if (r.user) {
        list.users.push({
          id: r.user.id,
          name: r.user.name,
          image: r.user.image ?? null,
        });
      } else {
        list.users.push({
          id: r.userId ?? r.id ?? Math.random().toString(36).slice(2),
          name: r.name ?? "Unknown",
          image: r.image ?? null,
        });
      }
      map.set(e, list);
    }
    return Array.from(map.values());
  }, [reactions]);

  const DEFAULT_EMOJIS = [
    "👍",
    "❤️",
    "🤣",
    "🔥",
    "😭",
    "🎉",
    "✅",
    "❌",
    "⚡",
    "💯",
    "😱",
    "🤯",
  ];

  // Popover open/close logic (unchanged)
  const openPopover = (e?: React.MouseEvent) => {
    if (!containerRef.current) return;
    if (e) {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("a")
      ) {
        return;
      }
    }

    const rect = containerRef.current.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(
        window.innerWidth - 8,
        rect.left + rect.width / 2 + window.scrollX
      )
    );
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const preferBelow = spaceBelow > spaceAbove;
    const top = preferBelow
      ? rect.bottom + window.scrollY + 8
      : rect.top + window.scrollY - 8;

    setPopoverPreferBelow(preferBelow);
    setPopoverPos({ left, top });
    setPopoverOpen(true);
  };

  useEffect(() => {
    if (!popoverOpen) return;

    const onDocDown = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setPopoverOpen(false);
      }
    };

    const onScroll = (ev: Event) => {
      const target = ev.target as Node | null;
      if (
        (popoverRef.current && target && popoverRef.current.contains(target)) ||
        (containerRef.current &&
          target &&
          containerRef.current.contains(target))
      ) {
        return;
      }
      setPopoverOpen(false);
    };

    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [popoverOpen]);

  useEffect(() => {
    if (isEditing) setPopoverOpen(false);
  }, [isEditing]);

  const popoverVariants = {
    hidden: { opacity: 0, scale: 0.96, y: popoverPreferBelow ? -6 : 6 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: popoverPreferBelow ? -6 : 6 },
  };

  const chipTap = shouldReduceMotion ? {} : { whileTap: { scale: 0.95 } };
  const emojiTap = shouldReduceMotion
    ? {}
    : { whileTap: { scale: 0.9 }, whileHover: { scale: 1.08 } };

  return (
    <motion.div
      ref={containerRef}
      data-message-id={msg.id}
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
        onClick={(e) => {
          if (msg.isDeleted) return;
          openPopover(e);
        }}
        className={`rounded-xl px-3 py-2 text-sm shadow-sm max-w-[85%] sm:max-w-[75%] break-words ${
          isOwn ? "bg-white text-black" : "bg-[#dcf8c6] text-black"
        } ${
          msg.isDeleted ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        }`}
        role="button"
        aria-label={msg.isDeleted ? "Message deleted" : "Open message actions"}
        aria-disabled={msg.isDeleted}
      >
        {!isOwn && (
          <p className="text-xs font-semibold mb-1 flex items-center gap-2">
            <span>{msg.senderName}</span>
            {/* NEW: show muted badge */}
            {isSenderMuted && (
              <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
                Muted
              </span>
            )}
          </p>
        )}

        {msg.replyTo?.id && (
          <button
            onClick={() => onJumpToMessage?.(msg.replyTo!.id)}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            className="mb-1 px-2 py-1 bg-black/5 border-l-4 border-blue-500 text-xs italic text-gray-800 rounded-md"
          >
            <strong>{msg.replyTo.senderName}</strong>:{" "}
            {String(msg.replyTo.content).slice(0, 40)}…
          </button>
        )}

        {isEditing ? (
          <div className="mt-1">
            <textarea
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full resize-none p-2 rounded-md bg-white/90 text-black"
              rows={3}
            />
            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditText(msg.content ?? "");
                }}
                type="button"
                className="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                type="button"
                className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap">{msg.content}</div>
            {/* Attachments preview */}
            {/* Attachments preview */}
            {Array.isArray(msg.attachments) &&
              msg.attachments.length > 0 &&
              (() => {
                const attCount = msg.attachments.length;
                return (
                  <div
                    className={`mt-2 grid gap-2 ${
                      attCount === 1 ? "grid-cols-1" : "grid-cols-3"
                    }`}
                  >
                    {msg.attachments.map((att) => (
                      <div
                        key={att.id}
                        // larger container for single image, compact for multiple
                        className={`relative rounded overflow-hidden ${
                          attCount === 1
                            ? "h-48 flex items-center justify-center"
                            : "h-32"
                        }`}
                      >
                        {att.mime?.startsWith("image/") ? (
                          <img
                            src={att.thumbUrl ?? att.storagePath ?? ""}
                            alt="Photo"
                            loading="lazy"
                            onClick={async () => {
                              const r = await fetch(
                                "/api/attachments/download",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    "x-user-id": userId,
                                  },
                                  body: JSON.stringify({
                                    path: att.storagePath,
                                  }),
                                }
                              );
                              const j = await r.json();
                              if (j.url) window.open(j.url, "_blank");
                            }}
                            // when single show object-contain and center, when multiple fill the cell
                            className={`block w-full ${
                              attCount === 1
                                ? "max-h-full h-auto object-contain"
                                : "h-full object-cover"
                            } cursor-pointer`}
                          />
                        ) : (
                          <button
                            onClick={async () => {
                              const r = await fetch(
                                "/api/attachments/download",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    "x-user-id": userId,
                                  },
                                  body: JSON.stringify({
                                    path: att.storagePath,
                                  }),
                                }
                              );
                              const j = await r.json();
                              if (j.url) window.open(j.url, "_blank");
                            }}
                            className="p-3 block bg-white/5 rounded w-full text-left h-32 flex flex-col justify-center"
                          >
                            <div className="text-sm font-medium truncate">
                              {att.storagePath.split("/").pop()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(att.size! / 1024).toFixed(1)} KB
                            </div>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
          </>
        )}

        {/* --- Reactions (left) + Timestamp / Seen (right) in one row --- */}
        {!msg.isDeleted && (
          <div className="mt-2 flex items-end justify-between gap-2 text-[10px] text-gray-500">
            {/* Left: reaction chips — allow wrapping, but reserve space so time doesn't overlap */}
            <div className="flex flex-wrap gap-2 max-w-[66%]">
              {(computedSummary || []).map((r: any) => (
                <motion.button
                  key={r.emoji}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onToggleReaction?.(msg.id, r.emoji)}
                  type="button"
                  layout
                  {...chipTap}
                  className={
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm shadow-sm select-none whitespace-nowrap leading-none " +
                    (r.reactedByMe
                      ? "ring-2 ring-yellow-300 bg-white"
                      : "bg-white/90 hover:bg-white")
                  }
                  aria-label={`React with/unreact ${r.emoji}`}
                >
                  <span className="text-lg leading-none">{r.emoji}</span>
                  <motion.span
                    layout
                    className="text-xs text-gray-700"
                    aria-hidden
                  >
                    {r.count}
                  </motion.span>
                </motion.button>
              ))}
            </div>

            {/* Right: time + edited/deleted markers, with seen button underneath */}
            <div className="flex items-end">
              <div className="flex items-center gap-1">
                <span className="text-[10px]">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>

                {msg.isEdited && (
                  <span className="text-[10px] italic text-gray-400">
                    (edited)
                  </span>
                )}
                {msg.isDeleted && (
                  <span className="text-[10px] italic text-gray-400">
                    (deleted)
                  </span>
                )}
              </div>

              {/* Seen button (keeps previous behavior) */}
              <div className="flex items-center gap-2 ml-2 mt-1">
                {isOwn && seenCount > 0 && (
                  <button
                    onClick={handleOpenSeenModal}
                    className="hover:text-blue-500 transition-colors flex items-center"
                    title={`Seen by ${seenCount}+`}
                    aria-label={`Open seen by (${seenCount})`}
                  >
                    <div className="flex items-center  mt-1">
                      <SeenButton
                        isOwn={isOwn}
                        seenCount={seenCount}
                        onOpenSeenModal={handleOpenSeenModal}
                      />
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seen modal (unchanged) */}
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
                  viewersFromMsg.map((viewer: any) => (
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
                                hour12: true,
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

      {/* Popover for actions + mute controls */}
      {canPortal &&
        createPortal(
          <AnimatePresence>
            {popoverOpen && popoverPos && (
              <motion.div
                key={`popover-${msg.id}`}
                ref={popoverRef}
                className="fixed z-50 left-0 top-0 pointer-events-auto"
                style={{ left: 0, top: 0 }}
                aria-modal="false"
                role="dialog"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={popoverVariants}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.08 }
                    : { type: "spring", stiffness: 600, damping: 30 }
                }
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    position: "absolute",
                    left: popoverPos.left,
                    top: popoverPos.top,
                    transform: popoverPreferBelow
                      ? "translate(-50%, 0)"
                      : "translate(-50%, -100%)",
                    zIndex: 60,
                    minWidth: 220,
                  }}
                >
                  <motion.div
                    className="bg-white rounded-lg shadow-lg max-w-xs p-3 ring-1 ring-black/5"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0.06 }
                        : { type: "spring", stiffness: 500, damping: 36 }
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 no-scrollbar">
                        {DEFAULT_EMOJIS.map((emoji) => (
                          <motion.button
                            key={emoji}
                            onClick={() => {
                              onToggleReaction?.(msg.id, emoji);
                              setPopoverOpen(false);
                            }}
                            type="button"
                            {...emojiTap}
                            className="p-2 rounded-md min-w-[38px] min-h-[38px] touch-manipulation select-none text-lg flex items-center justify-center"
                            aria-label={`React with ${emoji}`}
                          >
                            {emoji}
                          </motion.button>
                        ))}
                      </div>
                      <button
                        onClick={() => setPopoverOpen(false)}
                        className="text-gray-500 hover:text-black text-sm"
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="my-2 border-t border-gray-100" />

                    {/* Actions: Edit / Delete / Reply */}
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {!msg.isDeleted && (
                        <>
                          {canEdit && (
                            <button
                              onClick={() => {
                                setIsEditing(true);
                                setPopoverOpen(false);
                              }}
                              className="px-2 py-1 rounded-md text-sm hover:bg-gray-50"
                            >
                              Edit
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={confirmDelete}
                              className="px-2 py-1 rounded-md text-sm text-red-500 hover:bg-gray-50"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => {
                          onReply(msg);
                          setPopoverOpen(false);
                        }}
                        className="px-2 py-1 rounded-md text-sm hover:bg-gray-50"
                      >
                        Reply
                      </button>
                    </div>

                    <div className="my-1 border-t border-gray-100" />

                    {/* NEW: Mute controls (visible only to admins/owners and not for self) */}
                    <div className="mb-2">
                      {canActOnTarget ? (
                        <>
                          {!isSenderMuted ? (
                            <div className="flex gap-2 flex-wrap mb-2">
                              <button
                                onClick={() => handleMute(60 * 60)}
                                className="px-2 py-1 rounded-md text-sm hover:bg-gray-50"
                              >
                                Mute 1h
                              </button>
                              <button
                                onClick={() => handleMute(24 * 60 * 60)}
                                className="px-2 py-1 rounded-md text-sm hover:bg-gray-50"
                              >
                                Mute 24h
                              </button>
                              <button
                                onClick={() => handleMute(undefined)}
                                className="px-2 py-1 rounded-md text-sm text-red-600 hover:bg-gray-50"
                              >
                                Mute forever
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-sm text-gray-700">
                                Muted
                                {senderMuteInfo?.expiresAt
                                  ? ` until ${new Date(
                                      senderMuteInfo.expiresAt
                                    ).toLocaleString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}`
                                  : ""}
                              </div>
                              <button
                                onClick={handleUnmute}
                                className="px-2 py-1 rounded-md text-sm text-blue-600 hover:bg-gray-50"
                              >
                                Unmute
                              </button>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>

                    <div className="my-1 border-t border-gray-100" />

                    {/* Reaction groups */}
                    <div className="space-y-3 max-h-40 overflow-auto">
                      <AnimatePresence>
                        {reactionGroups.length > 0 ? (
                          reactionGroups.map((grp) => (
                            <motion.div
                              key={grp.emoji}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 6 }}
                              transition={
                                shouldReduceMotion
                                  ? { duration: 0.06 }
                                  : { type: "tween", duration: 0.14 }
                              }
                              className="flex items-center gap-3"
                            >
                              <div className="text-lg">{grp.emoji}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {grp.users.slice(0, 6).map((u) => (
                                    <div
                                      key={u.id}
                                      className="flex items-center gap-2"
                                    >
                                      {u.image ? (
                                        <Image
                                          src={u.image}
                                          alt={u.name}
                                          width={28}
                                          height={28}
                                          className="rounded-full object-cover w-7 h-7"
                                          unoptimized
                                        />
                                      ) : (
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center">
                                          {u.name?.charAt(0).toUpperCase() ||
                                            "?"}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {grp.users.length > 6 && (
                                    <div className="text-xs text-gray-500">
                                      +{grp.users.length - 6}
                                    </div>
                                  )}
                                  <div className="ml-2 text-xs text-gray-600">
                                    ({grp.users.length})
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {grp.users
                                    .slice(0, 3)
                                    .map((u) => u.name)
                                    .join(", ")}
                                  {grp.users.length > 3 ? "…" : ""}
                                </div>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-sm text-gray-500"
                          >
                            No reactions yet
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </motion.div>
  );
}

export const ChatMessage = React.memo(ChatMessageInner);
