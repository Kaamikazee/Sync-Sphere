// stores/useUnreadStore.ts
import { create } from "zustand";
import { getSocket } from "@/lib/socket";

interface UnreadState {
  unreadCounts: Record<string, number>; // key: chatId, value: count
  joinUnreadRoom: (chatId: string, userId: string) => void;
  getUnreadCount: (chatId: string) => number;
}

export const useUnreadStore = create<UnreadState>((set, get) => {
  const socket = getSocket();

  if (socket) {
    socket.on("chat:updateUnreadCount", ({ chatId, unreadCount }) => {
      set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [chatId]: unreadCount,
        },
      }));
    });
  }

  return {
    unreadCounts: {},

    joinUnreadRoom: (chatId, userId) => {
      if (!socket) return;
      socket.emit("joinUnreadRoom", `chat_${chatId}_${userId}`);
    },

    getUnreadCount: (chatId) => {
      return get().unreadCounts[chatId] ?? 0;
    },
  };
});
