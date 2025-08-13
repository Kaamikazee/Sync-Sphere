/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { MessageWithSenderInfo } from "@/types/extended";
import { MoveDownIcon, Send } from "lucide-react";
import Image from "next/image";
import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import { ChatMessage } from "./ChatMessage";
import { useMobile } from "@/hooks/use-mobile";
import { initSocket } from "@/lib/initSocket";
import { toast } from "sonner";
import { UserPermission } from "@prisma/client";

interface Props {
  group_id: string;
  userId: string;
  userName: string;
  userImage: string;
  groupName: string;
  groupImage: string;
  chatId: string | undefined;
  userRole: UserPermission;
}

type NormalizedMessage = MessageWithSenderInfo & {
  seenCount: number;
  seenPreview: { id: string; name: string; image?: string | null }[];
  seenByMe: boolean;
};

const createNormalizeMessage =
  (userId: string) =>
  (msg: MessageWithSenderInfo): NormalizedMessage => {
    const seenCount =
      typeof msg.seenCount === "number"
        ? msg.seenCount
        : Array.isArray(msg.views)
        ? msg.views.length
        : 0;

    let seenPreview: { id: string; name: string; image?: string | null }[] = [];

    if (Array.isArray(msg.seenPreview)) {
      seenPreview = msg.seenPreview
        .map((v: any) => ({
          id: v.id,
          name: v.name ?? "",
          image: v.image ?? null,
        }))
        .filter((v) => v.id !== userId);
    } else if (Array.isArray(msg.views)) {
      seenPreview = msg.views
        .map((v: any) => {
          if (v.user) {
            return {
              id: v.user.id,
              name: v.user.name ?? v.user.username ?? "",
              image: v.user.image ?? null,
            };
          }
          return {
            id: v.id ?? v.userId ?? v.user?.id,
            name: v.name ?? "",
            image: v.image ?? null,
          };
        })
        .filter((v) => v.id && v.id !== userId)
        .slice(0, 3);
    }

    const seenByMe =
      typeof (msg as any).seenByMe === "boolean"
        ? (msg as any).seenByMe
        : Array.isArray(msg.views)
        ? msg.views.some((v: any) => {
            const uid = v.id ?? v.user?.id ?? v.userId;
            return uid === userId;
          }) || msg.senderId === userId
        : msg.senderId === userId;

    return {
      ...msg,
      seenCount,
      seenPreview,
      seenByMe,
    };
  };

export const ChatContainer = ({
  group_id: groupId,
  userId,
  userName,
  groupName,
  groupImage,
  chatId,
  userRole,
}: Props) => {
  // keep single socket instance in a ref so it doesn't recreate across renders
  const socketRef = useRef(initSocket());
  const socket = socketRef.current;

  const [history, setHistory] = useState<MessageWithSenderInfo[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const isFirstLoad = useRef(true);
  const [replyTo, setReplyTo] = useState<MessageWithSenderInfo | null>(null);
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; userName: string }[]
  >([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const isMobile = useMobile();

  const TYPING_TIMEOUT = 1500;
  const typingTimeoutRef = useRef<number | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const debounceTimeoutRef = useRef<number | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const emittedMessageIds = useRef<Set<string>>(new Set());
  const initialRecentLoadedRef = useRef(false);
  const initialMessageIdsRef = useRef(new Set<string>());
  const joinLatestCreatedAtRef = useRef<Date | null>(null);
  const emittedIds = emittedMessageIds.current;
  const messageRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [pendingJumpId, setPendingJumpId] = useState<string | null>(null);
  const [mutedUsers, setMutedUsers] = useState<
    { userId: string; expiresAt?: string | null }[]
  >([]);
  const iAmMuted = useMemo(
    () => mutedUsers.some((m) => m.userId === userId),
    [mutedUsers, userId]
  );

  // stable normalize function
  const normalizeMessage = useMemo(
    () => createNormalizeMessage(userId),
    [userId]
  );

  // ---------------- helper: compute reaction summary ----------------
  const computeReactionSummary = useCallback(
    (reactions: any[] = [], currentUserId?: string) => {
      const map = new Map<
        string,
        {
          emoji: string;
          count: number;
          reactedByMe: boolean;
          sampleUsers: { id: string; name: string; image?: string | null }[];
        }
      >();

      for (const r of reactions) {
        const e = r.emoji;
        const entry = map.get(e) || {
          emoji: e,
          count: 0,
          reactedByMe: false,
          sampleUsers: [] as {
            id: string;
            name: string;
            image?: string | null;
          }[],
        };
        entry.count += 1;
        if (r.user && r.user.id === currentUserId) entry.reactedByMe = true;
        if (r.user)
          entry.sampleUsers.push({
            id: r.user.id,
            name: r.user.name ?? "",
            image: r.user.image ?? null,
          });
        map.set(e, entry);
      }

      return Array.from(map.values()).map((v) => ({
        emoji: v.emoji,
        count: v.count,
        reactedByMe: v.reactedByMe,
        sampleUsers: v.sampleUsers.slice(0, 3),
      }));
    },
    []
  );

  // ---------------- stable callbacks (prevent re-creation on each render) ----------------
  const waitForMessageElement = useCallback(
    async (
      id: string,
      { timeout = 5000, interval = 50 } = {}
    ): Promise<HTMLElement | null> => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const el = (messageRefs.current.get(id) ?? null) as HTMLElement | null;
        if (el) return el;
        await new Promise((r) => setTimeout(r, interval));
      }
      return null;
    },
    []
  );

  // toggle reaction (optimized: uses functional setHistory to avoid stale closures)
  const toggleReact = useCallback(
    (messageId: string, emoji: string) => {
      if (!socket) return;

      setHistory((prev) => {
        const m = prev.find((x) => x.id === messageId);
        if (!m) return prev;

        const myReaction = (m.reactions || []).find(
          (r: any) => r.user?.id === userId
        );

        if (myReaction && myReaction.emoji === emoji) {
          // unreact
          const newReactions = (m.reactions || []).filter(
            (r: any) => r.user?.id !== userId
          );
          const newSummary = computeReactionSummary(newReactions, userId);
          // emit outside setState
          setTimeout(
            () => socket.emit("message:unreact", { messageId, userId }),
            0
          );
          return prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, reactions: newReactions, reactionSummary: newSummary }
              : msg
          );
        } else {
          const other = (m.reactions || []).filter(
            (r: any) => r.user?.id !== userId
          );
          const tempReaction = {
            id: `temp_${userId}_${Date.now()}`,
            emoji,
            createdAt: new Date(),
            user: { id: userId },
          };
          const newReactions = [...other, tempReaction];
          const newSummary = computeReactionSummary(newReactions, userId);
          setTimeout(
            () => socket.emit("message:react", { messageId, emoji, userId }),
            0
          );
          return prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, reactions: newReactions, reactionSummary: newSummary }
              : msg
          );
        }
      });
    },
    [socket, userId, computeReactionSummary]
  );

  // jumpToMessage: stable
  const jumpToMessage = useCallback(
    async (messageId: string) => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const el = messageRefs.current.get(messageId) ?? null;
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        el.classList.add("ring-4", "ring-yellow-300", "bg-yellow-50");
        setTimeout(
          () =>
            el.classList.remove("ring-4", "ring-yellow-300", "bg-yellow-50"),
          2000
        );
        return;
      }

      try {
        socket?.emit("getMessageById", { messageId });
      } catch (err) {
        console.warn("getMessageById emit failed:", err);
      }
    },
    [socket]
  );

  // load more messages (pagination)
  const loadMoreMessages = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const firstMessage = history[0];

    try {
      socket?.emit("getMessages", {
        beforeMessageId: firstMessage?.id,
      });
    } catch (err) {
      console.warn("getMessages emit failed:", err);
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, history, socket]);

  // send message (stable)
  // change send signature to accept optional text
const send = useCallback(
  (text?: string) => {
    const content = text !== undefined ? text : draft;
    if (!content.trim()) return;
    if (iAmMuted) {
      const m = mutedUsers.find((u) => u.userId === userId);
      toast.error(
        `You are muted${
          m?.expiresAt ? ` until ${new Date(m.expiresAt).toLocaleString()}` : ""
        }`
      );
      return;
    }

    try {
      socket?.emit("groupMessage", {
        groupId,
        fromUserId: userId,
        text: content,
        replyToId: replyTo?.id || null,
      });
    } catch (err) {
      console.warn("groupMessage emit failed:", err);
    }

    // clear UI & timers
    setDraft("");
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // ensure server knows we're not typing (keep payload consistent)
    try {
      socket?.emit("stopTyping", { groupId, userId });
    } catch (err) {
      console.warn("stopTyping emit failed:", err);
    }
    if (inputRef.current) inputRef.current.style.height = "auto";
    setReplyTo(null);
  },
  // include dependencies
  [draft, groupId, userId, replyTo, socket, iAmMuted, mutedUsers]
);

// handleKeyDown: use the DOM value when Enter is pressed and DO NOT emit "typing" for that event
const handleKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If user pressed Enter to send (no shift) - grab current DOM value (may contain the latest char)
    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
      e.preventDefault();

      const textarea = e.currentTarget as HTMLTextAreaElement;
      const value = textarea.value; // read the DOM value directly

      // clear any pending typing/debounce timers to avoid re-emitting typing
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      // send using the DOM value
      send(value);
      return;
    }

    // normal keydown: indicate typing (for all other keys)
    try {
      if (socket?.connected) socket.emit("typing", { groupId, userId, userName });
      else socket?.connect();
    } catch (err) {
      console.warn("typing emit failed:", err);
    }

    if (typingTimeoutRef.current)
      window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      try {
        socket?.emit("stopTyping", { groupId, userId });
      } catch (err) {
        console.warn("stopTyping emit failed:", err);
      }
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT);
  },
  [socket, userId, userName, isMobile, send, groupId]
);

// handleChange: keep debounce but include groupId and keep the typing/stopTyping flow consistent
const handleChange = useCallback(
  (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDraft(value);

    // autosize
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;

    if (debounceTimeoutRef.current)
      window.clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = window.setTimeout(() => {
      try {
        if (socket?.connected) socket.emit("typing", { groupId, userId, userName });
        else socket?.connect();
      } catch (err) {
        console.warn("typing emit failed:", err);
      }

      if (typingTimeoutRef.current)
        window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => {
        try {
          socket?.emit("stopTyping", { groupId, userId });
        } catch (err) {
          console.warn("stopTyping emit failed:", err);
        }
        typingTimeoutRef.current = null;
      }, TYPING_TIMEOUT);
    }, 300) as unknown as number;
  },
  [socket, userId, userName, groupId]
);


  const openSeenModal = useCallback(
    (messageId: string) => {
      if (!socket) return;
      if (socket.connected) socket.emit("getMessageViews", { messageId });
      else {
        const once = () => {
          socket.emit("getMessageViews", { messageId });
          socket.off("connect", once);
        };
        socket.on("connect", once);
        socket.connect();
      }
    },
    [socket]
  );

  const handleEditMessageEmit = useCallback(
    (messageId: string, newContent: string) => {
      if (!socket) return;
      setHistory((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                content: newContent,
                isEdited: true,
                updatedAt: new Date(),
              }
            : m
        )
      );
      try {
        socket.emit("editMessage", { messageId, newContent, userId, groupId });
      } catch (err) {
        console.warn("editMessage emit failed:", err);
      }
    },
    [socket, userId, groupId]
  );

  const handleDeleteMessageEmit = useCallback(
    (messageId: string) => {
      if (!socket) return;
      setHistory((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: "[deleted]", isDeleted: true }
            : m
        )
      );
      try {
        socket.emit("deleteMessage", { messageId, userId, groupId });
      } catch (err) {
        console.warn("deleteMessage emit failed:", err);
      }
    },
    [socket, userId, groupId]
  );

  // ---------------- socket event wiring (single effect) ----------------
  useEffect(() => {
    if (!socket) return;

    // ensure connected only once
    if (!socket.connected) socket.connect();

    // handlers (wrap small adapter functions to avoid redeclaring too often)
    const onConnect = () => {
      socket.emit("joinGroup", { groupId, userId });
      if (chatId) socket.emit("chat:subscribe", { chatId, userId });
      socket.emit("getOnlineUsers", { groupId });
    };

    const handleRecentMessages = (msgs: MessageWithSenderInfo[]) => {
      const enriched = msgs
        .map(normalizeMessage)
        .map((m) => ({ ...m, seenByMe: true }));
      setHistory(enriched);
      initialRecentLoadedRef.current = true;
      initialMessageIdsRef.current = new Set(msgs.map((m) => m.id));
      if (msgs.length > 0) {
        const maxTs = msgs.reduce(
          (max, m) => Math.max(max, new Date(m.createdAt).getTime()),
          0
        );
        joinLatestCreatedAtRef.current = new Date(maxTs);
      } else {
        joinLatestCreatedAtRef.current = null;
      }
    };

    const handleOlderMessages = (msgs: MessageWithSenderInfo[]) => {
      if (!msgs || msgs.length === 0) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }
      const container = messagesContainerRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;
      const prevScrollTop = container?.scrollTop ?? 0;

      setHistory((prev) => {
        const enriched = msgs.map(normalizeMessage);
        const combined = [...enriched, ...prev];
        const seen = new Set<string>();
        return combined.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
      });

      // restore scroll to avoid jump
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const newScrollHeight = container?.scrollHeight ?? 0;
          if (container)
            container.scrollTop =
              newScrollHeight - prevScrollHeight + prevScrollTop;
          setLoadingMore(false);
        });
      });
    };

    const handleNewMessage = (msg: any) => {
      setHistory((prev) => {
        let reply = msg.replyTo ?? null;
        if (!reply && msg.replyToId) {
          const original = prev.find((m) => m.id === msg.replyToId);
          if (original) {
            reply = {
              id: original.id,
              senderName: original.senderName,
              content: original.content,
            };
          }
        }
        const enriched = normalizeMessage({ ...msg, replyTo: reply });
        return [...prev, enriched];
      });
    };

    const handleUserTyping = (u: { userId: string; userName: string }) => {
      setTypingUsers((curr) =>
        curr.some((x) => x.userId === u.userId)
          ? curr
          : [...curr, { userId: u.userId, userName: u.userName }]
      );
    };

    const handleUserStopTyping = ({ userId: uid }: { userId: string }) => {
      setTypingUsers((curr) => curr.filter((x) => x.userId !== uid));
    };

    const handleOnlineUsers = (ids: string[]) => setOnlineUserIds(ids);

    const handleMessageViews = (payload: {
      messageId: string;
      views: any[];
    }) => {
      setHistory((prev) =>
        prev.map((m) =>
          m.id === payload.messageId
            ? {
                ...m,
                views: payload.views,
                seenPreview: (payload.views || [])
                  .filter((v: any) => v.user && v.user.id !== userId)
                  .slice(0, 3)
                  .map((v: any) => ({
                    id: v.user.id,
                    name: v.user.name,
                    image: v.user.image ?? null,
                  })),
              }
            : m
        )
      );
    };

    const handleMessagesSeen = ({ seenByUser, messageIds }: any) => {
      if (!seenByUser || !messageIds || messageIds.length === 0) return;
      setHistory((prev) =>
        prev.map((msg) => {
          if (!messageIds.includes(msg.id)) return msg;
          if (seenByUser.id === userId) return msg;
          const already = (msg.seenPreview || []).some(
            (v) => v.id === seenByUser.id
          );
          const newPreview = already
            ? msg.seenPreview
            : [
                ...(msg.seenPreview || []),
                {
                  id: seenByUser.id,
                  name: seenByUser.name,
                  image: seenByUser.image ?? null,
                },
              ].slice(0, 3);
          return {
            ...msg,
            seenCount: msg.seenCount ? msg.seenCount + (already ? 0 : 1) : 1,
            seenPreview: newPreview,
          };
        })
      );
    };

    const handleMessageById = (msg: MessageWithSenderInfo | null) => {
      if (!msg) return;
      setHistory((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const combined = [...prev, normalizeMessage(msg)];
        combined.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return combined;
      });
      setPendingJumpId(msg.id);
    };

    const handleMessageEdited = (payload: {
      id: string;
      content: string;
      updatedAt?: Date;
      editorId?: string;
    }) => {
      if (!payload || !payload.id) return;
      setHistory((prev) =>
        prev.map((m) =>
          m.id === payload.id
            ? {
                ...m,
                content: payload.content,
                updatedAt: payload.updatedAt ?? new Date(),
                isEdited: true,
              }
            : m
        )
      );
    };

    const handleMessageDeleted = (payload: {
      id: string;
      isDeleted?: boolean;
    }) => {
      if (!payload || !payload.id) return;
      setHistory((prev) =>
        prev.map((m) =>
          m.id === payload.id
            ? {
                ...m,
                content: payload.isDeleted === false ? m.content : "[deleted]",
                isDeleted: payload.isDeleted ?? true,
              }
            : m
        )
      );
    };

    const handleReactionUpdated = (payload: any) => {
      const { messageId, reactions, summary } = payload;
      setHistory((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactions, reactionSummary: summary } : m
        )
      );
    };

    const handleReactionRemoved = (payload: any) => {
      const { messageId, reactions, summary } = payload;
      setHistory((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactions, reactionSummary: summary } : m
        )
      );
    };

    socket.emit("getMutedUsers", { groupId });

    const onMutedUsers = ({ users }: { users: any[] }) => {
      setMutedUsers(users || []);
    };
    const onUserMuted = (payload: any) => {
      setMutedUsers((prev) => [
        ...prev.filter((u) => u.userId !== payload.userId),
        { userId: payload.userId, expiresAt: payload.expiresAt },
      ]);
    };
    const onUserUnmuted = ({ userId }: { userId: string }) => {
      setMutedUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    // register handlers
    socket.on("connect", onConnect);
    socket.on("recentMessages", handleRecentMessages);
    socket.on("olderMessages", handleOlderMessages);
    socket.on("newMessage", handleNewMessage);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStopTyping", handleUserStopTyping);
    socket.on("online-users", handleOnlineUsers);
    socket.on("messageViews", handleMessageViews);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("messageById", handleMessageById);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messageReactionUpdated", handleReactionUpdated);
    socket.on("messageReactionRemoved", handleReactionRemoved);
    socket.on("mutedUsers", onMutedUsers);
    socket.on("userMuted", onUserMuted);
    socket.on("userUnmuted", onUserUnmuted);

    // if currently connected, call onConnect to rejoin rooms immediately
    if (socket.connected) onConnect();

    return () => {
      try {
        if (socket.connected) {
          socket.emit("leaveGroup", { groupId, userId });
          if (chatId) socket.emit("chat:unsubscribe", { chatId, userId });
        }
      } catch (err) {
        console.warn("Error emitting leave/unsubscribe:", err);
      }

      // remove handlers
      socket.off("connect", onConnect);
      socket.off("recentMessages", handleRecentMessages);
      socket.off("olderMessages", handleOlderMessages);
      socket.off("newMessage", handleNewMessage);
      socket.off("userTyping", handleUserTyping);
      socket.off("userStopTyping", handleUserStopTyping);
      socket.off("online-users", handleOnlineUsers);
      socket.off("messageViews", handleMessageViews);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("messageById", handleMessageById);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messageReactionUpdated", handleReactionUpdated);
      socket.off("messageReactionRemoved", handleReactionRemoved);
      socket.off("mutedUsers", onMutedUsers);
      socket.off("userMuted", onUserMuted);
      socket.off("userUnmuted", onUserUnmuted);

      // clear per-chat caches to avoid unbounded growth
      emittedIds.clear();
    };
  }, [socket, groupId, userId, chatId, normalizeMessage, emittedIds]);

  // rejoin rooms on reconnect/connect events (keeps a light handler)
  useEffect(() => {
    if (!socket) return;
    const rejoinRooms = () => {
      socket.emit("joinGroup", { groupId, userId });
      if (chatId) socket.emit("chat:subscribe", { chatId, userId });
      socket.emit("getOnlineUsers", { groupId });
    };

    socket.on("connect", rejoinRooms);
    socket.on("reconnect", rejoinRooms);
    if (socket.connected) rejoinRooms();
    return () => {
      socket.off("connect", rejoinRooms);
      socket.off("reconnect", rejoinRooms);
    };
  }, [socket, groupId, userId, chatId]);

  // pending jump effect — uses stable waitForMessageElement
  useEffect(() => {
    if (!pendingJumpId) return;
    let mounted = true;

    (async () => {
      const tryWait = async (timeout = 3000) => {
        return await waitForMessageElement(pendingJumpId, {
          timeout,
          interval: 50,
        });
      };

      let el = await tryWait(1500);
      if (!el) {
        socket?.emit("getMessagesAroundId", {
          messageId: pendingJumpId,
          before: 10,
          after: 5,
        });
        el = await tryWait(4000);
      }

      if (!mounted) return;

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-4", "ring-yellow-300", "bg-yellow-50");
        setTimeout(
          () =>
            el.classList.remove("ring-4", "ring-yellow-300", "bg-yellow-50"),
          2000
        );
      } else {
        console.warn(
          "[pendingJump] could not find element after fallback:",
          pendingJumpId
        );
      }

      if (mounted) setPendingJumpId(null);
    })();

    return () => {
      mounted = false;
    };
  }, [pendingJumpId, waitForMessageElement, socket]);

  // visibility handler to reconnect
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!socket.connected) socket.connect();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [socket]);

  // mark messages as seen when history updates (optimistic + reliable emit)
  useEffect(() => {
    if (!socket) return;

    const unseenMessages = history.filter(
      (m) =>
        !m.seenByMe &&
        m.senderId !== userId &&
        !emittedMessageIds.current.has(m.id)
    );
    if (unseenMessages.length === 0) return;

    const toEmit = unseenMessages.filter((m) => {
      if (!initialRecentLoadedRef.current) return true;
      return !initialMessageIdsRef.current.has(m.id);
    });
    if (toEmit.length === 0) return;

    const messageIds = toEmit.map((m) => m.id);

    // mark locally as seen
    messageIds.forEach((id) => emittedMessageIds.current.add(id));
    setHistory((prev) =>
      prev.map((msg) =>
        messageIds.includes(msg.id) ? { ...msg, seenByMe: true } : msg
      )
    );

    const emitMarkSeen = () => {
      try {
        socket.emit("markMessagesAsSeen", { messageIds });
      } catch (err) {
        console.warn("Failed to emit markMessagesAsSeen:", err);
      }
    };

    if (socket.connected) {
      emitMarkSeen();
    } else {
      const handle = () => {
        emitMarkSeen();
        socket.off("connect", handle);
      };
      socket.on("connect", handle);
      return () => {
        socket.off("connect", handle); // wrapped in block so cleanup returns void
      };
    }
  }, [history, userId, socket]);

  // set up scroll listener (rAF throttled)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const distanceFromBottom =
            container.scrollHeight -
            container.scrollTop -
            container.clientHeight;
          setIsAutoScroll(distanceFromBottom < 250);

          if (container.scrollTop < 100 && hasMore && !loadingMore) {
            loadMoreMessages();
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingMore, loadMoreMessages]);

  // small cleanup for timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current)
        window.clearTimeout(debounceTimeoutRef.current);
      if (typingTimeoutRef.current)
        window.clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // initial scroll-to-bottom on first load
  useLayoutEffect(() => {
    if (isFirstLoad.current && history.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      isFirstLoad.current = false;
    }
  }, [history]);

  // auto scroll on new messages if user hasn't scrolled away
  useEffect(() => {
    if (!isFirstLoad.current && isAutoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, isAutoScroll]);

  // keep body overflow while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // memoize typing string (cheap but avoids recalculating on each render)
  const typingDisplay = useMemo(() => {
    if (typingUsers.length === 1)
      return `${typingUsers[0].userName} is typing…`;
    if (typingUsers.length > 1)
      return `${typingUsers.map((u) => u.userName).join(", ")} are typing…`;
    return "";
  }, [typingUsers]);

  // stable handlers passed to ChatMessage to allow memoization inside ChatMessage
  const messageCallbacks = useMemo(
    () => ({
      onReply: (m: MessageWithSenderInfo) => {
        setReplyTo(m);
        setTimeout(() => inputRef.current?.focus(), 0);
      },
      onJumpToMessage: (id: string) => jumpToMessage(id),
      onEdit: (id: string, newContent: string) =>
        handleEditMessageEmit(id, newContent),
      onDelete: (id: string) => handleDeleteMessageEmit(id),
      openSeenModal,
      registerRef: (id: string, el: HTMLDivElement | null) => {
        if (el) messageRefs.current.set(id, el);
        else messageRefs.current.delete(id);
      },
      onToggleReaction: toggleReact,
    }),
    [
      jumpToMessage,
      handleEditMessageEmit,
      handleDeleteMessageEmit,
      openSeenModal,
      toggleReact,
    ]
  );

  return (
    <div
      className="fixed inset-0 sm:overflow-hidden flex items-start sm:items-center justify-center bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 p-2 sm:p-4 pt-6 sm:pt-0"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex flex-col w-full items-center h-full">
        <div className="w-full max-w-3xl h-[calc(100dvh-4rem)] sm:h-[90vh] flex flex-col relative">
          <div className="absolute top-0 left-0 right-0 z-30 h-16 sm:h-20 bg-white/20 backdrop-blur-lg border-b border-white/10 py-2 px-3 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors duration-200 hover:bg-white/20 shadow-[0_4px_6px_rgba(0,0,0,0.08)]">
            <div className="text-lg sm:text-2xl font-bold flex items-center bg-gradient-to-r from-pink-300 via-white to-pink-300 bg-clip-text text-transparent tracking-wide">
              <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden mr-2 shrink-0 bg-white/10">
                {groupImage ? (
                  <Image
                    src={groupImage}
                    alt="Group Image"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-sm sm:text-base font-bold text-white bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
                    {groupName?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>

              {groupName}
            </div>

            <div className="sm:mt-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-1 sm:mb-0 rounded-md bg-white/12 text-white/90 text-sm italic min-w-[8rem] max-w-[18rem] truncate">
                {typingDisplay}
              </div>
            </div>
          </div>

          <Card className="mt-16 sm:mt-20 w-full h-full flex flex-col backdrop-blur-lg bg-white/20 border border-white/20 border-t-0 shadow-2xl rounded-xl rounded-t-none overflow-hidden transition-all duration-300 hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
            <CardContent
              ref={messagesContainerRef}
              className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-1 px-2 pb-1 space-y-1 overscroll-behavior-contain"
              style={{
                WebkitOverflowScrolling: "touch",
                paddingBottom: "calc(env(safe-area-inset-bottom))",
              }}
            >
              {loadingMore && (
                <div className="text-center text-white/70 text-xs">
                  Loading more…
                </div>
              )}
              <div ref={topRef} />
              {history.map((msg) => {
                const isOwn = msg.senderId === userId;
                return (
                  <div
                    key={msg.id}
                    id={`message-${msg.id}`}
                    ref={(el) => {
                      if (el) messageRefs.current.set(msg.id, el);
                      else messageRefs.current.delete(msg.id);
                    }}
                    data-message-id={msg.id}
                  >
                    <ChatMessage
                      userId={userId}
                      msg={msg}
                      isOwn={isOwn}
                      isOnline={onlineUserIds.includes(msg.senderId)}
                      onReply={messageCallbacks.onReply}
                      onJumpToMessage={messageCallbacks.onJumpToMessage}
                      onEdit={messageCallbacks.onEdit}
                      onDelete={messageCallbacks.onDelete}
                      openSeenModal={messageCallbacks.openSeenModal}
                      registerRef={messageCallbacks.registerRef}
                      onToggleReaction={messageCallbacks.onToggleReaction}
                      socket={socket}
                      groupId={groupId}
                      currentUserRole={userRole} // e.g. "OWNER" | "ADMIN" | "MEMBER"
                      mutedUsers={mutedUsers}
                    />
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </CardContent>

            <CardFooter className="flex-shrink-0 bottom-0 mb-5 sm:mb-0 bg-white/10 backdrop-blur-md border-t border-white/25 py-2 px-2 flex flex-col gap-2 relative">
              {replyTo && (
                <div className="w-full bg-white/20 p-1 rounded-lg flex justify-between items-start backdrop-blur-sm">
                  <div className="text-white/85 text-xs">
                    <strong>{replyTo.senderName}</strong>:{" "}
                    <em>{replyTo.content.slice(0, 30)}…</em>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="text-white font-bold ml-2 text-lg leading-none transition-transform hover:rotate-90"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex gap-3 items-center">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => {
                    handleChange(e);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Type a message…"
                  style={{ maxHeight: "160px" }}
                  className="min-w-[18rem] sm:min-w-[22rem] flex-1 sm:flex-[2] resize-none overflow-auto bg-white/20 text-slate-900 placeholder-white/70 focus:bg-white/30 focus:placeholder-white/50 backdrop-blur-sm rounded-md py-2 px-4 text-base transition-all duration-200 no-scrollbar"
                />

                <button
                  data-ripple
                  onMouseDown={(e) => e.preventDefault()}
                  type="button"
                  onClick={() => send()}
                  className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-full shadow transform hover:scale-110 transition-transform duration-200"
                  aria-label="Send message"
                >
                  <Send size={22} />
                </button>
              </div>
            </CardFooter>

            {!isAutoScroll && (
              <button
                onClick={() => {
                  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                  setIsAutoScroll(true);
                }}
                className="fixed right-4 bottom-3 sm:bottom-6 z-50 bg-white/20 backdrop-blur-sm p-2 rounded-full shadow hover:bg-white/30 transition-transform duration-200 hover:scale-105"
                aria-label="Scroll to bottom"
                onMouseDown={(e) => e.preventDefault()}
                type="button"
              >
                <MoveDownIcon size={18} className="text-white" />
              </button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
