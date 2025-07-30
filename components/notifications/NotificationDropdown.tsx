import { Bell, AlertTriangle, AlarmClock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { io, Socket } from "socket.io-client";

interface Notification {
  id: string;
  type: "WARNING" | "WAKE_UP";
  message: string;
  isRead: boolean;
  createdAt: string;
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
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

 useEffect(() => {
  if (!socket) return;

  const handler = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  socket.on("notification:new", handler);

  return () => {
    socket?.off("notification:new", handler);
  };
}, [queryClient]);


  useEffect(() => {
    if (open) {
      markAllRead();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [open, markAllRead]);

  return (
    <>
      <button
        className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
        onClick={() => setOpen(true)}
      >
        <Bell className="text-black md:text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Slide Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 w-full max-w-sm h-full bg-white z-50 shadow-xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Notifications</h2>
                <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black">
                  <X />
                </button>
              </div>
              <ul className="overflow-y-auto divide-y flex-1">
                {notifications.length === 0 ? (
                  <li className="p-4 text-gray-500 text-center">No notifications</li>
                ) : (
                  notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`flex items-start gap-3 p-4 ${
                        n.isRead ? "bg-white" : "bg-gray-100"
                      }`}
                    >
                      {n.type === "WARNING" ? (
                        <AlertTriangle className="text-yellow-500" size={20} />
                      ) : (
                        <AlarmClock className="text-blue-500" size={20} />
                      )}
                      <div>
                        <p className="text-sm font-medium">{n.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
