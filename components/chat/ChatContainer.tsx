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
} from "react";
import { io, Socket } from "socket.io-client";
import { ChatMessage } from "./ChatMessage";

interface Props {
  group_id: string;
  userId: string;
  userName: string;
  userImage: string;
  groupName: string;
  groupImage: string;
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

export const ChatContainer = ({
  group_id: groupId,
  userId,
  userName,
  groupName,
  groupImage,
}: Props) => {
  useSocket();
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

  const TYPING_TIMEOUT = 1500;
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const key = e.key;
    if (key.length !== 1) return;
    socket?.emit("typing", { groupId, userId, userName });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("stopTyping", { groupId, userId });
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    socket?.emit("typing", { groupId, userId, userName });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("stopTyping", { groupId, userId });
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT);
  };

  const loadMoreMessages = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const firstMessage = history[0];
    socket?.emit("getMessages", {
      groupId,
      beforeMessageId: firstMessage?.id,
    });
    socket?.once("olderMessages", (olderMessages: MessageWithSenderInfo[]) => {
      if (olderMessages.length === 0) setHasMore(false);
      setHistory((prev) => {
        const all = [...olderMessages, ...prev];
        const seen = new Set();
        return all.filter((msg) => {
          if (seen.has(msg.id)) return false;
          seen.add(msg.id);
          return true;
        });
      });
      setLoadingMore(false);
      setTimeout(() => {
        topRef.current?.scrollIntoView({ behavior: "auto" });
      }, 0);
    });
  }, [hasMore, loadingMore, history, groupId]);

  useLayoutEffect(() => {
    if (isFirstLoad.current && history.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      isFirstLoad.current = false;
    }
  }, [history]);

  useEffect(() => {
    socket?.on("online-users", (ids: string[]) => {
      setOnlineUserIds(ids);
    });

    // This will be need if you want granular control over online/offline events for each users instead of sending the entire list, useful when there is heavy traffic or many users in the group
    // socket?.on("user-online", ({ userId }) => {
    //   setOnlineUserIds((prev) => [...new Set([...prev, userId])]);
    // });

    // socket?.on("user-offline", ({ userId }) => {
    //   setOnlineUserIds((prev) => prev.filter((id) => id !== userId));
    // });

    return () => {
      socket?.off("online-users");
      socket?.off("user-online");
      socket?.off("user-offline");
    };
  }, []);

  useEffect(() => {
    if (!isFirstLoad.current && isAutoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, isAutoScroll]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom < 250) {
        setIsAutoScroll(true);
      } else {
        setIsAutoScroll(false);
      }

      if (container.scrollTop < 100 && hasMore && !loadingMore) {
        loadMoreMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingMore, history, loadMoreMessages]);

  useEffect(() => {
    socket?.emit("joinGroup", { groupId, userId });

    socket?.on("recentMessages", (msgs: MessageWithSenderInfo[]) => {
      setHistory(msgs);
    });

    socket?.on("newMessage", (msg) => {
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
        const enriched: MessageWithSenderInfo = {
          ...msg,
          replyTo: reply,
        };
        return [...prev, enriched];
      });
    });

    socket?.on("userTyping", (u) => {
      const { userId: incomingId, userName: incomingName } = u;
      setTypingUsers((curr) =>
        curr.some((x) => x.userId === incomingId)
          ? curr
          : [...curr, { userId: incomingId, userName: incomingName }]
      );
    });

    socket?.on("userStopTyping", ({ userId }) => {
      setTypingUsers((curr) => curr.filter((x) => x.userId !== userId));
    });

    // --- Fix: Request online users immediately after joining ---
    const handleOnlineUsers = (ids: string[]) => setOnlineUserIds(ids);
    socket?.on("online-users", handleOnlineUsers);
    socket?.emit("getOnlineUsers", { groupId });

    return () => {
      socket?.emit("leaveGroup", { groupId });
      socket?.off("recentMessages");
      socket?.off("newMessage");
      socket?.off("userTyping");
      socket?.off("userStopTyping");
      socket?.off("online-users", handleOnlineUsers);
    };
  }, [groupId, userId]);

  const send = () => {
    if (!draft.trim()) return;
    socket?.emit("groupMessage", {
      groupId,
      fromUserId: userId,
      text: draft,
      replyToId: replyTo?.id || null,
    });
    setDraft("");

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
                msg={msg}
                isOwn={isOwn}
                isOnline={onlineUserIds.includes(msg.senderId)}
                onReply={(m) => {
                  setReplyTo(m);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
              />
            );
          })}

          <div ref={bottomRef} />
        </CardContent>

        {/* Footer */}
        <CardFooter className="bottom-0 bg-white/10 backdrop-blur-md border-t border-white/25 py-2 px-2 flex flex-col gap-2">
          {!isAutoScroll && (
            <button
              onClick={() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                setIsAutoScroll(true);
              }}
              className="absolute bottom-2 right-2 bg-white/20 backdrop-blur-sm p-1 rounded-full shadow hover:bg-white/30 transition-transform duration-200 hover:scale-105"
            >
              <MoveDownIcon size={18} className="text-white" />
            </button>
          )}

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

          <div className="flex gap-2 items-center">
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
              style={{ maxHeight: "120px" }}
              className="min-w-[10rem] sm:min-w-[16rem] flex-1 resize-none overflow-auto bg-white/20 	text-slate-900 placeholder-white/70 focus:bg-white/30 focus:placeholder-white/50 backdrop-blur-sm rounded-full py-1.5 px-3 text-sm transition-all duration-200"
            />

            <button
              onMouseDown={(e) => e.preventDefault()}
              type="button"
              onClick={send}
              className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white p-2 rounded-full shadow transform hover:scale-110 transition-transform duration-200"
            >
              <Send size={18} />
            </button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
