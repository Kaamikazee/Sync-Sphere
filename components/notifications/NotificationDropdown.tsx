// components/NotificationDropdown.tsx
"use client";

import { Bell, AlertTriangle, AlarmClock } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { motion } from "framer-motion";
import { io, Socket } from "socket.io-client";
// import { socket } from "@/lib/socket";

interface Notification {
  id: string;
  type: "WARNING" | "WAKE_UP";
  message: string;
  isRead: boolean;
  createdAt: string;
}

let socket: Socket | null = null;

const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';

function useSocket() {
  useEffect(() => {
    if (!socket) {
      socket = io(baseUrl);
    }
  }, []);
}
export function NotificationDropdown() {
  useSocket();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await axios.get("/api/notifications/get");
      return res.data;
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const { mutate: markAllRead } = useMutation({
     mutationFn: async () => {
      const { data } = await axios.put("/api/notifications/mark-as-read");
      return data;
    },
    onSuccess: () => {
      // Refetching notifications or update state
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (!socket) return;
    // Listen for new notification events
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    socket.on("notification:new", handler);
    return () => {
      socket?.off("notification:new", handler);
    };
  }, [queryClient]);

  useEffect(() => {
    if (open) markAllRead();
  }, [open, markAllRead]);

  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell className="text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute right-0 mt-2 w-80 bg-white text-black rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          <div className="p-4 border-b font-semibold text-lg">Notifications</div>
          <ul className="max-h-72 overflow-y-auto divide-y">
            {notifications.length === 0 && (
              <li className="p-4 text-gray-500 text-center">No notifications</li>
            )}
            {notifications.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 p-3 ${n.isRead ? "bg-white" : "bg-gray-100"}`}>
                {n.type === "WARNING" ? (
                  <AlertTriangle className="text-yellow-500" size={20} />
                ) : (
                  <AlarmClock className="text-blue-500" size={20} />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
