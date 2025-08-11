/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
import { MessageWithSenderInfo } from "@/types/extended";
import { MoveDownIcon, Send } from "lucide-react";
import Image from "next/image";
import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
// import { io, Socket } from "socket.io-client";
import { ChatMessage } from "./ChatMessage";
// import { getSocket } from "@/lib/socket";
import { useMobile } from "@/hooks/use-mobile";
import { initSocket } from "@/lib/initSocket";

interface Props {
  group_id: string;
  userId: string;
  userName: string;
  userImage: string;
  groupName: string;
  groupImage: string;
  chatId: string | undefined;
}
// const socket = getSocket();

// helper factory (needs userId in closure)
const createNormalizeMessage =
  (userId: string) => (msg: MessageWithSenderInfo) => {
    // Prefer server-provided seenCount; otherwise, derive from views array length
    const seenCount =
      typeof msg.seenCount === "number"
        ? msg.seenCount
        : Array.isArray(msg.views)
        ? msg.views.length
        : 0;

    // Build a normalized preview array (prefer server-provided seenPreview)
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
      // msg.views may be preview rows or full rows (with user relation)
      seenPreview = msg.views
        .map((v: any) => {
          if (v.user) {
            return {
              id: v.user.id,
              name: v.user.name ?? v.user.username ?? "",
              image: v.user.image ?? null,
            };
          }
          // fallback shapes: { id, name, image } or { userId }
          return {
            id: v.id ?? v.userId ?? v.user?.id,
            name: v.name ?? "",
            image: v.image ?? null,
          };
        })
        .filter((v) => v.id && v.id !== userId)
        .slice(0, 3);
    }

    // seenByMe: prefer explicit server flag else check views or senderId
    const seenByMe =
      typeof msg.seenByMe === "boolean"
        ? msg.seenByMe
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
}: Props) => {
  // useSocket();
  const socket = initSocket();
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useMobile();

  const TYPING_TIMEOUT = 1500;
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const emittedMessageIds = useRef<Set<string>>(new Set());

  const normalizeMessage = useMemo(
    () => createNormalizeMessage(userId),
    [userId]
  );

  // subscribe to per-user chat room for unread counts
  useEffect(() => {
    if (!socket) return;

    // ensure connection
    if (!socket.connected) socket.connect();

    const onConnect = () => {
      console.log("[chat] socket connected -> rejoin rooms", socket.id);
      // join the group room
      socket.emit("joinGroup", { groupId, userId });
      // subscribe to per-chat unread room
      if (chatId) socket.emit("chat:subscribe", { chatId, userId });
      // request online users list
      socket.emit("getOnlineUsers", { groupId });
    };

    const handleRecentMessages = (msgs: MessageWithSenderInfo[]) => {
      const enriched = msgs.map(normalizeMessage);
      setHistory(enriched);
    };

    const handleOlderMessages = (msgs: MessageWithSenderInfo[]) => {
      if (!msgs || msgs.length === 0) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

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

      setLoadingMore(false);
      // keep view stable near top
      setTimeout(() => topRef.current?.scrollIntoView({ behavior: "auto" }), 0);
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
      const { userId: incomingId, userName: incomingName } = u;
      setTypingUsers((curr) =>
        curr.some((x) => x.userId === incomingId)
          ? curr
          : [...curr, { userId: incomingId, userName: incomingName }]
      );
    };

    const handleUserStopTyping = ({ userId: uid }: { userId: string }) => {
      setTypingUsers((curr) => curr.filter((x) => x.userId !== uid));
    };

    const handleOnlineUsers = (ids: string[]) => setOnlineUserIds(ids);

    // bulk seen: server says "user X has seen everything <= seenAt"
    const handleMessagesSeenBulk = ({
      seenByUser,
      seenAt,
    }: {
      seenByUser: any;
      seenAt: string | Date;
    }) => {
      console.log("[chat] messagesSeenBulk", { seenByUser, seenAt });
      if (!seenByUser || !seenAt) return;
      const seenDate = new Date(seenAt);

      setHistory((prev) =>
        prev.map((msg) => {
          // only affect messages up to seenAt and not sent by the seen user
          if (new Date(msg.createdAt) > seenDate) return msg;
          if (msg.senderId === seenByUser.id) return msg; // sender doesn't count

          // if the preview already contains this user, nothing to do
          const already = (msg.seenPreview || []).some(
            (v) => v.id === seenByUser.id
          );
          if (already) return msg;

          const newPreview = [
            ...(msg.seenPreview || []),
            {
              id: seenByUser.id,
              name: seenByUser.name,
              image: seenByUser.image ?? null,
            },
          ].slice(0, 3);

          return {
            ...msg,
            seenCount: (msg.seenCount || 0) + 1,
            seenPreview: newPreview,
          };
        })
      );
    };

    const handleMessagesSeen = ({ seenByUser, messageIds }: any) => {
      if (!seenByUser || !messageIds || messageIds.length === 0) return;

      setHistory((prev) =>
        prev.map((msg) => {
          if (!messageIds.includes(msg.id)) return msg;

          // If this is the current user, we likely already set seenByMe optimistically — ignore.
          if (seenByUser.id === userId) {
            // Optionally: ensure seenByMe true for these messages
            return { ...msg, seenByMe: true };
          }

          const already = (msg.seenPreview || []).some(
            (v) => v.id === seenByUser.id
          );
          if (already) return msg;

          const newPreview = [
            ...(msg.seenPreview || []),
            {
              id: seenByUser.id,
              name: seenByUser.name,
              image: seenByUser.image ?? null,
            },
          ].slice(0, 3);

          return {
            ...msg,
            seenCount: (msg.seenCount || 0) + 1,
            seenPreview: newPreview,
          };
        })
      );
    };

    const handleMessageViews = (payload: {
      messageId: string;
      views: any[];
    }) => {
      console.log("[chat] messageViews (container) payload:", payload);
      setHistory((prev) =>
        prev.map((m) =>
          m.id === payload.messageId
            ? {
                ...m,
                // store raw views or transform into seenPreview/viewers
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

    // register named handlers so we can reliably remove them
    socket.on("connect", onConnect);
    socket.on("recentMessages", handleRecentMessages);
    socket.on("olderMessages", handleOlderMessages);
    socket.on("newMessage", handleNewMessage);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStopTyping", handleUserStopTyping);
    socket.on("online-users", handleOnlineUsers);
    socket.on("messagesSeenBulk", handleMessagesSeenBulk);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("messageViews", handleMessageViews);

    // if already connected, run onConnect to rejoin
    if (socket.connected) onConnect();

    return () => {
      // gracefully leave rooms and cleanup handlers
      try {
        if (socket.connected) {
          socket.emit("leaveGroup", { groupId, userId });
          if (chatId) socket.emit("chat:unsubscribe", { chatId, userId });
        }
      } catch (err) {
        console.warn("Error emitting leave/unsubscribe:", err);
      }

      socket.off("connect", onConnect);
      socket.off("recentMessages", handleRecentMessages);
      socket.off("olderMessages", handleOlderMessages);
      socket.off("newMessage", handleNewMessage);
      socket.off("userTyping", handleUserTyping);
      socket.off("userStopTyping", handleUserStopTyping);
      socket.off("online-users", handleOnlineUsers);
      socket.off("messagesSeenBulk", handleMessagesSeenBulk);
      socket.off("messagesSeen", handleMessagesSeen);

      // clear per-chat caches to avoid unbounded growth
      emittedMessageIds.current.clear();
    };
  }, [socket, groupId, userId, chatId, normalizeMessage]);

  const openSeenModal = (messageId: string) => {
    // emit getMessageViews for this messageId and container's single messageViews handler
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
  };

  // inside the consolidated effect (or in a small dedicated effect)
  useEffect(() => {
    if (!socket) return;

    const rejoinRooms = () => {
      console.log("[chat] rejoinRooms", {
        socketId: socket.id,
        groupId,
        chatId,
      });
      console.log("[client] emitting joinGroup", { groupId, userId });
      socket.emit("joinGroup", { groupId, userId });
      if (chatId) socket.emit("chat:subscribe", { chatId, userId });
      socket.emit("getOnlineUsers", { groupId });
    };

    socket.on("connect", rejoinRooms);
    socket.on("reconnect", rejoinRooms);

    // if already connected when mounting, call immediately
    if (socket.connected) rejoinRooms();

    return () => {
      socket.off("connect", rejoinRooms);
      socket.off("reconnect", rejoinRooms);
    };
  }, [socket, groupId, userId, chatId]);

  // --- mark messages as seen when history updates (optimistic + reliable emit) ---
  useEffect(() => {
    if (!socket) return;

    const unseenMessages = history.filter(
      (m) =>
        !m.seenByMe &&
        m.senderId !== userId &&
        !emittedMessageIds.current.has(m.id)
    );
    if (unseenMessages.length === 0) return;

    const messageIds = unseenMessages.map((m) => m.id);
    messageIds.forEach((id) => emittedMessageIds.current.add(id));

    setHistory((prev) =>
      prev.map((msg) =>
        messageIds.includes(msg.id)
          ? {
              ...msg,
              seenByMe: true,
            }
          : msg
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
      // ensure we emit after connect
      const handle = () => {
        emitMarkSeen();
        socket.off("connect", handle);
      };
      socket.on("connect", handle);

      // cleanup this temporary handler if effect re-runs or unmounts before connecting
      return () => {
        socket.off("connect", handle);
      };
    }
  }, [history, userId, socket]);

  // --- key handlers ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const key = e.key;

    // fire typing; be defensive
    try {
      if (socket?.connected) socket.emit("typing", { userId, userName });
      else socket?.connect();
    } catch (err) {
      console.warn("typing emit failed:", err);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      try {
        socket?.emit("stopTyping", { userId });
      } catch (err) {
        console.warn("stopTyping emit failed:", err);
      }
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT);

    if (key === "Enter" && !e.shiftKey && !isMobile) {
      e.preventDefault();
      send();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDraft(value);

    // simple autosize
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      try {
        if (socket?.connected) socket.emit("typing", { userId, userName });
        else socket?.connect();
      } catch (err) {
        console.warn("typing emit failed:", err);
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        try {
          socket?.emit("stopTyping", { userId });
        } catch (err) {
          console.warn("stopTyping emit failed:", err);
        }
        typingTimeoutRef.current = null;
      }, TYPING_TIMEOUT);
    }, 300);
  };

  // --- pagination helper ---
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

  useLayoutEffect(() => {
    if (isFirstLoad.current && history.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      isFirstLoad.current = false;
    }
  }, [history]);

  // --- scroll listeners (single place) ---
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setIsAutoScroll(distanceFromBottom < 250);

      if (container.scrollTop < 100 && hasMore && !loadingMore) {
        loadMoreMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingMore, history, loadMoreMessages]);

  useEffect(() => {
    const onViewportResize = () => {
      // keep input visible by scrolling messages to bottom
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", onViewportResize);
    return () => {
      if (vv) vv.removeEventListener("resize", onViewportResize);
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!socket.connected) socket.connect();
        // ensure rejoinRooms handler on connect will do the join
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [socket]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isFirstLoad.current && isAutoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, isAutoScroll]);

  const send = () => {
    if (!draft.trim()) return;

    // optional: optimistic append could be added here (not implemented)
    try {
      socket?.emit("groupMessage", {
        groupId,
        fromUserId: userId,
        text: draft,
        replyToId: replyTo?.id || null,
      });
    } catch (err) {
      console.warn("groupMessage emit failed:", err);
    }

    setDraft("");

    // cancel typing indicators
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    try {
      socket?.emit("stopTyping", { groupId, userId });
    } catch (err) {
      console.warn("stopTyping emit failed:", err);
    }

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setReplyTo(null);
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 p-2 sm:p-4">
      <Card className="w-full max-w-3xl max-h-[100dvh] sm:max-h-[90vh] h-full flex flex-col backdrop-blur-lg bg-white/20 border border-white/20 shadow-2xl rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
        {/* Header */}
        <CardHeader className="sticky top-0 bg-white/10 backdrop-blur-md border-b border-white/25 z-10 py-2 px-3 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors duration-200 hover:bg-white/20">
          <CardTitle className="text-lg sm:text-2xl font-bold flex items-center bg-gradient-to-r from-pink-300 via-white to-pink-300 bg-clip-text text-transparent tracking-wide">
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
          </CardTitle>
          <CardDescription className="text-[10px] sm:text-xs text-white/80 mt-1 sm:mt-0 italic">
            {typingUsers.length === 1
              ? `${typingUsers[0].userName} is typing…`
              : typingUsers.length > 1
              ? `${typingUsers.map((u) => u.userName).join(", ")} are typing…`
              : ""}
          </CardDescription>
        </CardHeader>

        {/* Messages */}
        <CardContent
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto no-scrollbar pt-1 px-2 pb-1 space-y-1 overscroll-behavior-contain"
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
              <ChatMessage
                key={msg.id}
                userId={userId}
                msg={msg}
                isOwn={isOwn}
                isOnline={onlineUserIds.includes(msg.senderId)}
                onReply={(m) => {
                  setReplyTo(m);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                openSeenModal={openSeenModal}
              />
            );
          })}

          <div ref={bottomRef} />
        </CardContent>

        {/* Footer */}
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
                e.target.style.height = "auto"; // Reset height
                e.target.style.height = `${e.target.scrollHeight}px`; // Grow with content
              }}
              onKeyDown={(e) => {
                handleKeyDown(e);
              }}
              rows={1}
              placeholder="Type a message…"
              style={{ maxHeight: "160px" }}
              className="min-w-[18rem] sm:min-w-[22rem] flex-1 sm:flex-[2] resize-none overflow-auto bg-white/20 text-slate-900 placeholder-white/70 focus:bg-white/30 focus:placeholder-white/50 backdrop-blur-sm rounded-md py-2 px-4 text-base transition-all duration-200 no-scrollbar"
            />

            <button
              onMouseDown={(e) => e.preventDefault()}
              type="button"
              onClick={send}
              className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-full shadow transform hover:scale-110 transition-transform duration-200"
              aria-label="Send message"
            >
              <Send size={22} />
            </button>
          </div>
        </CardFooter>
      </Card>
      {/* Floating "scroll to bottom" button — floats above the footer so it never overlaps the send button */}
      {!isAutoScroll && (
        <button
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            setIsAutoScroll(true);
          }}
          className="fixed right-4 bottom-3 sm:bottom-6 z-50 bg-white/20 backdrop-blur-sm p-2 rounded-full shadow hover:bg-white/30 transition-transform duration-200 hover:scale-105"
          aria-label="Scroll to bottom"
          // avoid stealing focus / closing keyboard on mobile accidentally
          onMouseDown={(e) => e.preventDefault()}
          type="button"
        >
          <MoveDownIcon size={18} className="text-white" />
        </button>
      )}
    </div>
  );
};
