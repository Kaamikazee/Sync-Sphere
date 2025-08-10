// hooks/useChatSyncOnShow.ts
import { MessageWithSenderInfo } from "@/types/extended";
import { useEffect } from "react";
import { Socket } from "socket.io-client";
// import { MessageWithSenderInfo } from "@/types"; // adjust path

type Args = {
  socket: Socket | null;
  groupId: string;
  userId: string;
  chatId?: string | null;
  lastMessageId?: string | null;
  onNewMessages?: (msgs: MessageWithSenderInfo[]) => void;
};

export function useChatSyncOnShow({
  socket,
  groupId,
  userId,
  chatId,
  lastMessageId,
  onNewMessages,
}: Args) {
  useEffect(() => {
    if (!socket) return;

    const refresh = () => {
      if (!socket.connected) {
        try {
          socket.connect();
        } catch {
            console.log("Not connected socket");
            
        }
      }

      socket.emit("joinGroup", { groupId, userId });
      if (chatId) socket.emit("chat:subscribe", { chatId, userId });
      socket.emit("getOnlineUsers", { groupId });

      // only get messages newer than last known
      socket.emit("getMessages", { afterMessageId: lastMessageId || undefined });
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        refresh();
      }
    };

    window.addEventListener("pageshow", onPageShow);

    // listen for server's reply only once here
    const handleNewMessages = (msgs: MessageWithSenderInfo[]) => {
      if (msgs.length && typeof onNewMessages === "function") {
        onNewMessages(msgs);
      }
    };
    socket.on("newMessagesBatch", handleNewMessages); // custom event from server

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      socket.off("newMessagesBatch", handleNewMessages);
    };
  }, [socket, groupId, userId, chatId, lastMessageId, onNewMessages]);
}
