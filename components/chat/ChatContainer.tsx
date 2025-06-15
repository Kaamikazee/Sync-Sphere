"use client";

import { ChatScreen } from "./ChatScreen";

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
import { MessageWithSenderInfo } from "@/types/extended";
import { MoveDownIcon, Send } from "lucide-react";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { io, Socket } from "socket.io-client";

interface Props {
  group_id: string;
  userId: string;
  userName: string;
  userImage: string;
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
  userImage,
}: Props) => {
  useSocket();
  const [history, setHistory] = useState<MessageWithSenderInfo[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
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
  const [isTyping, setIsTyping] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setDraft(text);

    if (!isTyping) {
      setIsTyping(true);
      socket?.emit("typing", { groupId, userId, userName });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit("stopTyping", { groupId, userId });
    }, TYPING_TIMEOUT);
  };

  // in your component:
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;

    // 1) ignore backspace/delete/enter/arrows/etc.
    if (key.length !== 1) return;

    // 2) emit typing every real character key
    socket?.emit("typing", { groupId, userId, userName });

    // 3) reset your stopTyping timer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("stopTyping", { groupId, userId });
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT);
  };

  useLayoutEffect(() => {
    if (isFirstLoad.current && history.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      isFirstLoad.current = false;
    }
  }, [history]);

  // 2. Then for *subsequent* messages, smooth‐scroll if auto‐scrolling
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
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    socket?.emit("joinGroup", { groupId, userId });

    socket?.on("recentMessages", (msgs: MessageWithSenderInfo[]) => {
      setHistory(msgs);
    });

    socket?.on("newMessage", (msg) => {
      setHistory((prev) => {
        // if the server sent replyTo already, use it…
        let reply = msg.replyTo ?? null;

        // …otherwise, if it sent replyToId only, find the original
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

        // build the enriched message
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-600 p-6">
      <Card className="w-full max-w-3xl h-[90vh] flex flex-col backdrop-blur-md bg-white/10 border border-white/20 shadow-lg">
        
        {/* Header */}
        <CardHeader className="sticky top-0 bg-white/20 backdrop-blur-md border-b border-white/30 z-10 p-4 flex flex-col items-center">
          <CardTitle className="text-2xl font-bold text-white">
            Chat Room
          </CardTitle>
          <CardDescription className="text-sm text-white/90 mt-1">
            {typingUsers.length === 1
              ? `${typingUsers[0].userName} is typing…`
              : typingUsers.length > 1
              ? `${typingUsers.map((u) => u.userName).join(", ")} are typing…`
              : "No one is typing"}
          </CardDescription>
        </CardHeader>

        {/* Messages */}
        <CardContent
          className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4"
          ref={messagesContainerRef}
        >
          {history.map((msg: any) => {
            const isOwn = msg.senderId === userId;
            return (
              <ChatScreen
                key={msg.id}
                content={msg.content}
                createdAt={new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                userName={msg.senderName}
                userImage={msg.senderImage}
                own={isOwn}
                replyTo={msg.replyTo ?? undefined}
                onReply={() => {
                  setReplyTo(msg);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
              />
            );
          })}

          <div ref={bottomRef} />
        </CardContent>

        {/* Footer */}
        <CardFooter className="sticky bottom-0 bg-white/20 backdrop-blur-md border-t border-white/30 p-4 flex flex-col gap-2">
          
          {/* Scroll-to-bottom */}
          {!isAutoScroll && (
            <Button
              onClick={() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                setIsAutoScroll(true);
              }}
              className="self-end mb-2 bg-white/20 backdrop-blur-md p-2 rounded-full shadow-md hover:bg-white/40 transition"
            >
              <MoveDownIcon size={20} className="text-white" />
            </Button>
          )}

          {/* Reply Preview */}
          {replyTo && (
            <div className="w-full bg-white/30 p-2 rounded-lg flex justify-between items-start">
              <div className="text-white/90 text-sm">
                <strong>{replyTo.senderName}</strong>:{" "}
                <em>{replyTo.content.slice(0, 50)}…</em>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-white font-bold ml-4"
              >
                ×
              </button>
            </div>
          )}

          {/* Input Row */}
          <div className="flex gap-2 items-center">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                handleKeyDown(e)
                if (e.key === "Enter") send();
              }}
              placeholder="Type a message…"
              className="flex-1 bg-white/20 text-white placeholder-white/70 focus:bg-white/30 focus:placeholder-white/50 transition"
            />
            <Button
              onClick={send}
              className="bg-indigo-500 hover:bg-indigo-400 text-white p-2 rounded-full shadow-md hover:shadow-xl transition"
            >
              <Send size={20} />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
