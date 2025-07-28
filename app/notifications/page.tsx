"use client";

import { Button } from "@/components/ui/button";
import { Notification } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const Notifications = () => {
  const queryClient = useQueryClient();
  // Fetch notifications from the API
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await axios.get("/api/notifications/get");
      return data;
    },
  });

  
  const {mutate, isPending} = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await axios.post("/api/notifications/mark-as-read", {
        notificationId,
      });
      return data;
    },
    onSuccess: () => {
      // Refetching notifications or update state
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  })

  const {mutate: ReadAll, isPending: isReadAllPending} = useMutation({
    mutationFn: async () => {
      const { data } = await axios.put("/api/notifications/mark-as-read");
      return data;
    },
    onSuccess: () => {
      // Refetching notifications or update state
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  })

  // Function to handle marking a notification as read
  const handleMarkAllAsRead = () => {
    if (isReadAllPending) return; // Prevent multiple clicks
    ReadAll();
  };

  const handleClick = (notificationId: string) => {
    if (isPending) return; // Prevent multiple clicks
    mutate(notificationId);
  }
  console.log("Notifications:", notifications);
  return (
    <div className="p-6 bg-gradient-to-br from-purple-500/30 via-blue-400/30 to-indigo-500/30 backdrop-blur-md border border-white/20 shadow-lg flex justify-center hover:shadow-2xl hover:scale-105 transition-transform duration-300">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-extrabold text-white mb-2 text-center">
            Notifications
          </h2>
          <Button
            onClick={handleMarkAllAsRead}
            disabled={isReadAllPending}
          >Mark all as read</Button>
        </div>
        <ul className="divide-y divide-white/30 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md bg-white/10 border border-white/20">
          {notifications?.map((notification: Notification) => {
            const isUnread = notification.isRead === false;
            return (
              <li key={notification.id}>
                <div
                  className={`flex items-center justify-between py-4 px-6 transition-all duration-300 text-white/90 rounded-xl
            hover:scale-105 hover:bg-white/10 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:ring-2 hover:ring-white/30
            ${
              isUnread
                ? "bg-indigo-600/30 border-l-4 border-indigo-400 font-bold shadow-lg scale-105 ring-2 ring-indigo-300"
                : ""
            }`}
                onClick={() => isUnread && handleClick(notification.id)}
                >
                  <div className="flex items-center space-x-4">
                    <span
                      className={`text-lg ${isUnread ? "text-indigo-100" : ""}`}
                    >
                      {notification.message ?? "Anonymous"}
                    </span>
                    {isUnread && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-400 text-white animate-pulse">
                        New
                      </span>
                    )}
                  </div>
                </div>{" "}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Notifications;
