"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { initSocket } from "@/lib/initSocket";
import { MessageWithSenderInfo } from "@/types/extended";
import { MoveDownIcon, Send } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { io, Socket } from "socket.io-client";

interface Props {
  group_id: string;
  userId: string;
  userName: string;
  userImage: string;
  groupName: string;
  groupImage: string;
}

let socket: Socket | null = null;

function useSocket() {
  useEffect(() => {
    if (!socket) {
      socket = io("http://localhost:3001");
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
  const inputRef = useRef<HTMLInputElement>(null);

  const TYPING_TIMEOUT = 1500;
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  // const socket = initSocket(userId)

//   function useSocket() {
//   useEffect(() => {
//     if (!socket) {
//       socket = io("http://localhost:3001", {
//         auth: {
//           userId
//         }
//       });
//     }
//   }, []);
// }


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const loadMoreMessages = () => {
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
  };

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

  socket?.on("user-online", ({ userId }) => {
    setOnlineUserIds((prev) => [...new Set([...prev, userId])]);
  });

  socket?.on("user-offline", ({ userId }) => {
    setOnlineUserIds((prev) => prev.filter((id) => id !== userId));
  });

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
  }, [hasMore, loadingMore, history]);

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

    return () => {
      socket?.emit("leaveGroup", { groupId });
      socket?.off("recentMessages");
      socket?.off("newMessage");
      socket?.off("userTyping");
      socket?.off("userStopTyping");
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
    setReplyTo(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 p-2">
      <Card className="w-full max-w-3xl h-screen flex flex-col backdrop-blur-lg bg-white/20 border border-white/20 shadow-2xl rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
        <CardHeader className="sticky top-0 bg-white/10 backdrop-blur-md border-b border-white/25 z-10 py-1 px-2 flex flex-col items-center transition-colors duration-200 hover:bg-white/20">
          <CardTitle className="text-2xl font-bold flex items-center bg-gradient-to-r from-pink-300 via-white to-pink-300 bg-clip-text text-transparent tracking-wide">
            <div className="w-11 h-11 rounded-full overflow-hidden mr-2">
              <Image src={groupImage} alt="Group Image" width={50} height={50} />
            </div>
            {groupName}
          </CardTitle>
          <CardDescription className="text-xs text-white/80 mt-0.5 italic">
            {typingUsers.length === 1
              ? `${typingUsers[0].userName} is typing…`
              : typingUsers.length > 1
              ? `${typingUsers.map((u) => u.userName).join(", ")} are typing…`
              : ""}
          </CardDescription>
        </CardHeader>

        <CardContent
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto no-scrollbar pt-1 px-2 pb-1 space-y-1"
        >
          {loadingMore && (
            <div className="text-center text-white/70 text-xs">Loading more…</div>
          )}
          <div ref={topRef} />
          {history.map((msg) => {
            const isOwn = msg.senderId === userId;
            return (
              <div
                key={msg.id}
                className={`flex ${
                  isOwn ? "justify-end" : "justify-start"
                } py-1 px-2 relative`}
              >
                {!isOwn && (
                  <div className="relative w-8 h-8 mr-2 shrink-0">
  <Image
    src={msg.senderImage}
    alt="pfp"
    width={32}
    height={32}
    className="rounded-full object-cover w-full h-full"
  />
  {onlineUserIds.includes(msg.senderId) && (
    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
  )}
</div>
                )}
                <div
                  className={`rounded-xl px-3 py-2 text-sm shadow-sm max-w-[75%] ${
                    isOwn ? "bg-white text-black" : "bg-[#dcf8c6] text-black"
                  }`}
                >
                  {!isOwn && (
                    <p className="text-xs font-semibold mb-1">
                      {msg.senderName}
                    </p>
                  )}
                  {msg.replyTo && (
                    <div className="mb-1 px-2 py-1 bg-black/5 border-l-4 border-blue-500 text-xs italic text-gray-800 rounded-md">
                      <strong>{msg.replyTo.senderName}</strong>: {msg.replyTo.content.slice(0, 40)}…
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className="text-[10px] text-gray-500 text-right mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {!isOwn && (
                  <button
                    onClick={() => {
                      setReplyTo(msg);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-gray-600 shadow absolute right-1 -translate-y-1/2 top-1/2"
                  >
                    ↩
                  </button>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </CardContent>

        <CardFooter className="sticky bottom-0 bg-white/10 backdrop-blur-md border-t border-white/25 py-1 px-2 flex flex-col gap-2">
          {!isAutoScroll && (
            <button
              onClick={() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                setIsAutoScroll(true);
              }}
              className="absolute bottom-1.5 right-2 bg-white/20 backdrop-blur-sm p-1 rounded-full shadow hover:bg-white/30 transition-transform duration-200 hover:scale-105"
            >
              <MoveDownIcon size={20} className="text-white" />
            </button>
          )}

          {replyTo && (
            <div className="w-full bg-white/20 p-1 rounded-lg flex justify-between items-start backdrop-blur-sm">
              <div className="text-white/85 text-xs">
                <strong>{replyTo.senderName}</strong>: <em>{replyTo.content.slice(0, 30)}…</em>
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
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                handleKeyDown(e);
                if (e.key === "Enter") send();
              }}
              placeholder="Type a message…"
              className="flex-1 bg-white/20 text-white placeholder-white/70 focus:bg-white/30 focus:placeholder-white/50 backdrop-blur-sm rounded-full py-1 px-2 transition-all duration-200"
            />
            <Button
              onClick={send}
              className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white p-2 rounded-full shadow transform hover:scale-110 transition-transform duration-200"
            >
              <Send size={20} />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
