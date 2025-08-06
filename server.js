// server.js
import { createServer } from "http";
import express from "express";
import next from "next";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

import {handleMessageSeen} from "./messageSeen.js"
// import { messaging } from "firebase-admin";

const prisma = new PrismaClient();
const port = process.env.PORT || 3001;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);

  server.use(express.static("public"));
  server.use(cors()); // Required for cross-origin WebSocket connections

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  const userTimers = new Map(); // key: userId, value: { startTime, totalSeconds }
  // const onlineUsers = new Map(); // userId -> socket.id

  // --- ONLINE USERS TRACKING ---
  const groupOnlineUsers = new Map(); // groupId -> Set of userIds
  const socketToUserGroup = new Map(); // socket.id -> { userId, groupId }

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    console.log("🟢 [server] socket connected:", socket.id);
    handleMessageSeen(socket);

    socket.on("startActivity", async ({ activityId, startTime }) => {
      console.log("Activity started:", activityId);
      try {
        const activity = await prisma.activity.findUnique({
          where: {
            id: activityId,
          },
        });

        const baseline = activity.timeSpent;
        io.emit("activityStarted", { activityId, startTime, baseline });
      } catch (error) {
        console.log("Error starting activity:", error);
      }
    });

    // --- TIMER UPDATE HANDLER --

    socket.on("updateTimer", async ({ activityId, elapsedTime }) => {
      console.log("Timer updated:", activityId, elapsedTime);
      try {
        await prisma.activity.update({
          where: { id: activityId },
          data: { timeSpent: elapsedTime },
        });
        io.emit("timerUpdated", { activityId, elapsedTime });
      } catch (error) {
        console.error("Error updating timer:", error);
      }
    });

    socket.on("stopActivity", async ({ activityId, elapsedTime }) => {
      console.log("Activity stopped:", activityId);
      try {
        await prisma.activity.update({
          where: { id: activityId },
          data: { timeSpent: elapsedTime },
        });
        io.emit("activityStopped", { activityId, elapsedTime });
      } catch (error) {
        console.error("Error stopping activity:", error);
      }
    });

    // -------- CHAT PAGINATION -------------

    socket.on("getMessages", async ({ groupId, beforeMessageId }) => {
      const PAGE_SIZE = 20;

      try {
        const chat = await prisma.chat.findFirst({
          where: { groupId },
        });

        if (!chat) {
          return socket.emit("error", "Chat not found");
        }

        let messages;

        if (beforeMessageId) {
          const referenceMessage = await prisma.message.findUnique({
            where: { id: beforeMessageId },
          });

          if (!referenceMessage) return;

          messages = await prisma.message.findMany({
            where: {
              chatId: chat.id,
              createdAt: { lt: referenceMessage.createdAt },
            },
            orderBy: { createdAt: "desc" },
            take: PAGE_SIZE,
            include: {
              sender: true,
              replyTo: {
                include: {
                  sender: {
                    select: { name: true },
                  },
                },
              },
            },
          });
        } else {
          // Initial load (optional, you can remove if handled separately)
          messages = await prisma.message.findMany({
            where: { chatId: chat.id },
            orderBy: { createdAt: "desc" },
            take: PAGE_SIZE,
            include: {
              seenBy: {
                include: {
                  user: {
                    select: { id: true, name: true, image: true },
                  },
                },
              },
              sender: true,
              replyTo: {
                include: {
                  sender: {
                    select: { name: true },
                  },
                },
              },
            },
          });
        }

        // Reverse the order so oldest messages appear first in chat
        const formattedMessages = messages.reverse().map((msg) => ({
          id: msg.id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          content: msg.content,
          createdAt: msg.createdAt,
          senderName: msg.sender.name,
          senderImage: msg.sender.image,
          replyTo: msg.replyTo
            ? {
                id: msg.replyTo.id,
                senderName: msg.replyTo.sender.name,
                content: msg.replyTo.content,
              }
            : null,
        }));

        socket.emit("olderMessages", formattedMessages);
      } catch (error) {
        console.error("Error in getMessages:", error);
        socket.emit("error", "Failed to load older messages");
      }
    });

    // --- TOTAL TIME HANDLER ---

    socket.on("getAllTotals", async (groupId) => {
      try {
        const groupMembers = await prisma.subscription.findMany({
          where: {
            groupId: groupId,
          },
          select: {
            userId: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        });

        const userIds = groupMembers.map((m) => m.userId);

        const activityTotals = await prisma.activity.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
          },
          _sum: {
            timeSpent: true,
          },
        });

        // const totals = await prisma.activity.groupBy({
        //   by: ["userId"],
        //   _sum: { timeSpent: true },
        // });

        // totals is an array like:
        // [ { userId: "abc", _sum: { timeSpent: 1234 } }, … ]
        // map to simpler shape:

        const userTotal = groupMembers.map((member) => {
          const total =
            activityTotals.find((a) => a.userId === member.userId)?._sum
              .timeSpent || 0;

          return {
            userId: member.userId,
            name: member.user.name,
            image: member.user.image,
            totalTime: total,
          };
        });

        // emit back just to the requester:
        socket.emit("allTotals", userTotal);
      } catch (err) {
        console.error("Error fetching all totals:", err);
        socket.emit("error", "Could not load totals");
      }
    });

    //  --- CHAT HANDLER ---

    socket.on("joinGroup", async ({ groupId, userId }) => {
      console.log("Group Joined", groupId);
      socket.join(groupId);
      const current = userTimers.get(userId);
      socket.to(groupId).emit("user-joined", { userId, ...current });

      let chat = await prisma.chat.findFirst({
        where: { groupId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              seenBy: {
                include: {
                  user: {
                    select: { id: true, name: true, image: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            group: {
              connect: {
                id: groupId,
              },
            },
          },
          include: {
            messages: { orderBy: { createdAt: "asc" } },
          },
        });
      }
      socket.join(`chat_${chat.id}`);
      console.log(`Socket: ${socket.id} & Group: ${groupId}`);

      const recent = await prisma.message.findMany({
        where: {
          chatId: chat.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        include: {
          sender: {
            select: {
              name: true,
              image: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              sender: { select: { name: true } },
            },
          },
        },
      });
      socket.emit(
        "recentMessages",
        recent.reverse().map((msg) => ({
          id: msg.id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          content: msg.content,
          createdAt: msg.createdAt,
          senderName: msg.sender?.name ?? "Unknown",
          senderImage: msg.sender?.image ?? null,
          replyToId: msg.replyToId ?? null,

          replyTo: msg.replyTo
            ? {
                id: msg.replyTo.id,
                senderName: msg.replyTo.sender.name,
                content: msg.replyTo.content,
              }
            : null,
        }))
      );

      // Track online users
      if (!groupOnlineUsers.has(groupId))
        groupOnlineUsers.set(groupId, new Set());
      groupOnlineUsers.get(groupId).add(userId);
      socketToUserGroup.set(socket.id, { userId, groupId });
      io.to(groupId).emit(
        "online-users",
        Array.from(groupOnlineUsers.get(groupId))
      );
    });

    socket.on("start-timer", ({ userId, startTime }) => {
      console.log("TIMER-STARTED");
      io.emit("timer-started", { userId, startTime });
    });

    socket.on("stop-timer", ({ userId, totalSeconds }) => {
      console.log("TIMER-STOPPED");
      io.emit("timer-stopped", { userId, totalSeconds });
    });

    socket.on("tick", ({ userId, currentTotalSeconds }) => {
      io.emit("timer-tick", { userId, currentTotalSeconds });
    });

    // in your socket setup
    socket.on("typing", async ({ groupId, userId, userName }) => {
      // broadcast to everyone _except_ the typer
      const chat = await prisma.chat.findFirst({ where: { groupId } });
      if (!chat) return;

      io.to(`chat_${chat.id}`)
        .except(socket.id)
        .emit("userTyping", { userId, userName });
    });

    socket.on("stopTyping", async ({ groupId, userId }) => {
      const chat = await prisma.chat.findFirst({ where: { groupId } });
      if (!chat) return;

      io.to(`chat_${chat.id}`)
        .except(socket.id)
        .emit("userStopTyping", { userId });
    });

    socket.on(
      "groupMessage",
      async ({ groupId, fromUserId, text, replyToId }) => {
        const chat = await prisma.chat.findFirst({
          where: { groupId },
        });

        if (!chat) return socket.emit("error", "Chat not found");

        const saved = await prisma.message.create({
          data: {
            chat: { connect: { id: chat.id } },
            sender: { connect: { id: fromUserId } },
            content: text,
            replyTo: replyToId ? { connect: { id: replyToId } } : undefined,
          },
          include: {
            sender: true,
            replyTo: {
              include: {
                sender: { select: { name: true } },
              },
            },
          },
        });

        // Notify everyone in the group
        io.to(`chat_${chat.id}`).emit("newMessage", {
          id: saved.id,
          chatId: saved.chatId,
          senderId: saved.senderId,
          content: saved.content,
          createdAt: saved.createdAt,
          senderName: saved.sender.name,
          senderImage: saved.sender.image,
          replyTo: saved.replyTo
            ? {
                id: saved.replyTo.id,
                senderName: saved.replyTo.sender.name,
                content: saved.replyTo.content,
              }
            : null,
        });
      }
    );

    socket.on("leaveGroup", async ({ groupId, userId }) => {
      const chat = await prisma.chat.findFirst({ where: { groupId } });
      if (!chat) return;
      socket.leave(`chat_${chat.id}`);
      socket.leave(groupId);

      // Remove from online users
      if (groupOnlineUsers.has(groupId)) {
        groupOnlineUsers.get(groupId).delete(userId);
        io.to(groupId).emit(
          "online-users",
          Array.from(groupOnlineUsers.get(groupId))
        );
      }
      socketToUserGroup.delete(socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      const info = socketToUserGroup.get(socket.id);
      if (info) {
        const { userId, groupId } = info;
        if (groupOnlineUsers.has(groupId)) {
          groupOnlineUsers.get(groupId).delete(userId);
          io.to(groupId).emit(
            "online-users",
            Array.from(groupOnlineUsers.get(groupId))
          );
        }
        socketToUserGroup.delete(socket.id);
      }
    });

    // Respond to getOnlineUsers event
    socket.on("getOnlineUsers", ({ groupId }) => {
      const online = groupOnlineUsers.get(groupId) || new Set();
      socket.emit("online-users", Array.from(online));
    });
  }); // <-- closes io.on('connection', ...)
  // --- SIMPLE TIMER HANDLER ---

  server.all("*", (req, res) => {
    if (!req.url) {
      console.error("Invalid request URL");
      return res.status(400).send("Bad Request");
    }
    return handle(req, res);
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`Server running at http://localhost:${port}`);
  });
});
