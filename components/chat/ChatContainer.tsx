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
}: Props) => {
  useSocket();
  const [history, setHistory] = useState<MessageWithSenderInfo[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const isFirstLoad = useRef(true);

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

    socket?.on("newMessage", (msg: MessageWithSenderInfo) => {
      setHistory((h) => [...h, msg]);
    });

    return () => {
      socket?.emit("leaveGroup", { groupId });
      socket?.off("recentMessages");
      socket?.off("newMessage");
    };
  }, [groupId, userId]);

  const send = () => {
    if (!draft.trim()) return;
    socket?.emit("groupMessage", {
      groupId,
      fromUserId: userId,
      text: draft,
    });
    setDraft("");
  };

  return (
    <>
      <Card className="w-full h-screen bg-gradient-to-br from-blue-400 to-purple-600 p-6 flex flex-col gap-4">
        <CardHeader className="flex flex-col justify-center items-center sticky top-0">
          <CardTitle>Chat</CardTitle>
          <CardDescription>Kamikaze is typing...</CardDescription>
        </CardHeader>
        <CardContent
          className="w-full max-w-3xl mx-auto flex-1 overflow-y-auto no-scrollbar"
          ref={messagesContainerRef}
        >
          {history.map((m) => (
            <ChatScreen
              key={m.id}
              content={m.content}
              createdAt={new Date(m.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              userName={m.senderName}
              userImage={m.senderImage}
              own={m.senderId === userId}
            />
          ))}
          <div ref={bottomRef} />
        </CardContent>
        <CardFooter
          className="flex-shrink-0 bg-white/10 backdrop-blur-md sticky bottom-0 w-full 
               max-w-3xl mx-auto p-4 justify-center items-center"
        >
          {!isAutoScroll && (
            <Button
              onClick={() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                setIsAutoScroll(true);
              }}
              className="fixed bottom-24 right-6 z-50 shadow-lg rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 cursor-pointer"
            >
              <MoveDownIcon className="font-bold" size={25}/>
            </Button>
          )}
          <div className="flex gap-2 ">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
            />
            <Button onClick={send}>
              <Send />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );
};
