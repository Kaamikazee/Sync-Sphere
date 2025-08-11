// server.js
import { createServer } from "http";
import express from "express";
import next from "next";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
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

  // server-side helper — drop this in and call instead of older implementations
async function emitUnreadCount(chatId, userId, socket = null) {
  try {
    if (!chatId || !userId) return;

    // fetch the user's chatSeen (may be null)
    const mySeen = await prisma.chatSeen.findUnique({
      where: { chatId_userId: { chatId, userId } },
      select: { seenAt: true },
    });

    // Compose robust where clause:
    // - same chat
    // - only messages not sent by this user
    // - if we have chatSeen, only messages strictly newer than seenAt
    // - ALWAYS exclude messages the user already has a MessageView for
    const andClauses = [
      // exclude messages that user explicitly viewed (so they won't be counted again)
      { views: { none: { userId } } },
    ];
    if (mySeen && mySeen.seenAt) {
      andClauses.push({ createdAt: { gt: mySeen.seenAt } });
    }

    const where = {
      chatId,
      NOT: { senderId: userId },
      AND: andClauses,
    };

    const unreadCount = await prisma.message.count({ where });

    const room = `chat_${chatId}_${userId}`;

    // broadcast to per-user room (keeps multi-tab/devices in sync)
    io.to(room).emit("chat:updateUnreadCount", { chatId, unreadCount });

    // also reply directly to the provided socket (if available) so the requester always gets it
    if (socket) socket.emit("chat:updateUnreadCount", { chatId, unreadCount });
  } catch (err) {
    console.error("[emitUnreadCount] error:", err);
  }
}


  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    console.log("🟢 [server] socket connected:", socket.id);

    socket.on("joinUnreadRoom", ({ chatId, userId }) => {
      const room = `chat_${chatId}_${userId}`;
      socket.join(room);
    });

    // on the server
    socket.on("getUnreadCount", async ({ chatId, userId }) => {
      try {
        if (!chatId || !userId) return;

        // compute unread count using ChatSeen (same logic as emitUnreadCount)
        const mySeen = await prisma.chatSeen.findUnique({
          where: { chatId_userId: { chatId, userId } },
          select: { seenAt: true },
        });

        const where = {
          chatId,
          NOT: { senderId: userId },
          ...(mySeen ? { createdAt: { gt: mySeen.seenAt } } : {}),
        };

        const unreadCount = await prisma.message.count({ where });

        const room = `chat_${chatId}_${userId}`;
        console.log("[getUnreadCount] replying", {
          chatId,
          userId,
          unreadCount,
          room,
        });

        // 1) emit to the per-user room (keeps multi-tab/devices in sync)
        io.to(room).emit("chat:updateUnreadCount", { chatId, unreadCount });

        // 2) also reply **directly** to the requesting socket (guaranteed delivery)
        socket.emit("chat:updateUnreadCount", { chatId, unreadCount });
      } catch (err) {
        console.error("[getUnreadCount] error:", err);
      }
    });

    socket.on("chat:subscribe", ({ chatId, userId }) => {
      console.log(`[chat:subscribe] Joining room chat_${chatId}_${userId}`);
      socket.join(`chat_${chatId}_${userId}`);
    });

    socket.on("chat:unsubscribe", ({ chatId, userId }) => {
      console.log(`[chat:unsubscribe] Leaving room chat_${chatId}_${userId}`);
      socket.leave(`chat_${chatId}_${userId}`);
    });

    socket.on("markMessagesAsSeen", async ({ messageIds }) => {
      const userId = socket.data.userId;
      if (!userId || !Array.isArray(messageIds) || messageIds.length === 0)
        return;

      try {
        // 1) create per-message MessageView rows (skip duplicates)
        await prisma.messageView.createMany({
          data: messageIds.map((id) => ({ userId, messageId: id })),
          skipDuplicates: true,
        });

        // 2) fetch messages info (chatId + createdAt)
        const msgs = await prisma.message.findMany({
          where: { id: { in: messageIds } },
          select: { id: true, chatId: true, createdAt: true },
        });

        // group message ids by chatId and find max createdAt per chat
        const byChat = new Map(); // chatId -> { ids: [...], maxCreatedAt: Date }
        for (const m of msgs) {
          if (!byChat.has(m.chatId))
            byChat.set(m.chatId, { ids: [], maxCreatedAt: m.createdAt });
          const obj = byChat.get(m.chatId);
          obj.ids.push(m.id);
          if (m.createdAt > obj.maxCreatedAt) obj.maxCreatedAt = m.createdAt;
        }

        // fetch existing ChatSeen rows for these chatIds (for this user) to keep monotonicity
        const chatIds = Array.from(byChat.keys());
        const existingSeen = await prisma.chatSeen.findMany({
          where: { chatId: { in: chatIds }, userId },
          select: { chatId: true, seenAt: true },
        });
        const existingSeenMap = new Map(
          existingSeen.map((r) => [r.chatId, r.seenAt])
        );

        // upsert chatSeen for each affected chat
        for (const [chatId, { ids, maxCreatedAt }] of byChat) {
          const existing = existingSeenMap.get(chatId);
          // ensure monotonic: newSeenAt = max(existing, maxCreatedAt, now())
          // prefer maxCreatedAt (the latest message the user marked as seen);
          // but we should not move seenAt backwards if existing is later.
          const candidate = maxCreatedAt;
          const newSeenAt =
            existing && existing > candidate ? existing : candidate;

          await prisma.chatSeen.upsert({
            where: { chatId_userId: { chatId, userId } },
            update: { seenAt: newSeenAt },
            create: { chatId, userId, seenAt: newSeenAt },
          });

          const mySeen = await prisma.chatSeen.findUnique({
            where: { chatId_userId: { chatId, userId } },
            select: { seenAt: true },
          });
          const room = `chat_${chatId}_${userId}`;


          const unreadCount = await prisma.message.count({
            where: {
              chatId: chatId,
              NOT: { senderId: userId },
              ...(mySeen ? { createdAt: { gt: mySeen.seenAt } } : {}),
            },
          });

          io.to(room).emit("chat:updateUnreadCount", {
            chatId: chatId,
            unreadCount,
          });
          socket.emit("chat:updateUnreadCount", {
            chatId: chatId,
            unreadCount,
          });

          // notify other clients in the chat that these specific messages were seen by this user
          const seenByUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, image: true },
          });

          io.to(`chat_${chatId}`).except(socket.id).emit("messagesSeen", {
            messageIds: ids,
            seenByUser,
          });

          // update unread counts for this user if needed
          emitUnreadCount(chatId, userId);
        }
      } catch (error) {
        console.error("❌ Failed to mark messages as seen:", error);
      }
    });

    socket.on("getMessageViews", async ({ messageId }) => {
      try {
        const msg = await prisma.message.findUnique({
          where: { id: messageId },
          select: { id: true, chatId: true, createdAt: true },
        });
        if (!msg) return socket.emit("messageViews", { messageId, views: [] });

        // explicit per-message views
        const explicit = await prisma.messageView.findMany({
          where: { messageId },
          include: {
            user: {
              select: { id: true, name: true, image: true, username: true },
            },
          },
          orderBy: { seenAt: "desc" },
        });

        // chatSeens that imply this message was seen
        const chatSeens = await prisma.chatSeen.findMany({
          where: { chatId: msg.chatId, seenAt: { gte: msg.createdAt } },
          include: {
            user: {
              select: { id: true, name: true, image: true, username: true },
            },
          },
        });

        // merge into a map to dedupe
        const map = new Map(); // userId => { id, name, image, seenAt }
        for (const v of explicit) {
          map.set(v.user.id, {
            id: v.user.id,
            name: v.user.name,
            image: v.user.image ?? null,
            seenAt: v.seenAt,
          });
        }
        for (const cs of chatSeens) {
          if (!map.has(cs.userId)) {
            map.set(cs.userId, {
              id: cs.user.id,
              name: cs.user.name,
              image: cs.user.image ?? null,
              seenAt: cs.seenAt,
            });
          } else {
            // If both exist, keep the one with the more precise seenAt (explicit messageView likely better)
            const existing = map.get(cs.userId);
            if (cs.seenAt > existing.seenAt) {
              map.set(cs.userId, {
                id: cs.user.id,
                name: cs.user.name,
                image: cs.user.image ?? null,
                seenAt: cs.seenAt,
              });
            }
          }
        }

        const views = Array.from(map.values()).sort(
          (a, b) => b.seenAt - a.seenAt
        );
        socket.emit("messageViews", { messageId, views });
      } catch (err) {
        console.error("Error in getMessageViews:", err);
        socket.emit("messageViews", { messageId, views: [] });
      }
    });

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

    socket.on("getMessages", async ({ beforeMessageId }) => {
      const PAGE_SIZE = 20;
      const chatId = socket.data.chatId;
      const userId = socket.data.userId;

      if (!chatId || !userId) {
        return socket.emit("error", "Missing group or user information");
      }

      try {
        // fetch a page of messages (same strategy as before)
        let messages;
        if (beforeMessageId) {
          const ref = await prisma.message.findUnique({
            where: { id: beforeMessageId },
            select: { createdAt: true },
          });
          if (!ref) return;
          messages = await prisma.message.findMany({
            where: { chatId, createdAt: { lt: ref.createdAt } },
            orderBy: { createdAt: "desc" },
            take: PAGE_SIZE,
            include: {
              sender: { select: { name: true, image: true } },
              replyTo: { include: { sender: { select: { name: true } } } },
              _count: { select: { views: true } },
            },
          });
        } else {
          messages = await prisma.message.findMany({
            where: { chatId },
            orderBy: { createdAt: "desc" },
            take: PAGE_SIZE,
            include: {
              sender: { select: { name: true, image: true } },
              replyTo: { include: { sender: { select: { name: true } } } },
              _count: { select: { views: true } },
            },
          });
        }

        const page = messages.reverse(); // earliest -> latest in this page
        const messageIds = page.map((m) => m.id);

        // 1) get chatSeens for other users for this chat
        const chatSeens = await prisma.chatSeen.findMany({
          where: { chatId, userId: { not: userId } },
          select: {
            userId: true,
            seenAt: true,
            user: { select: { id: true, name: true, image: true } },
          },
        });

        // 2) get explicit messageViews for these messageIds
        const messageViews = await prisma.messageView.findMany({
          where: { messageId: { in: messageIds } },
          include: { user: { select: { id: true, name: true, image: true } } },
        });

        // 3) get this requester's ChatSeen
        const myChatSeen = await prisma.chatSeen.findUnique({
          where: { chatId_userId: { chatId, userId } },
          select: { seenAt: true },
        });

        // group messageViews by messageId for quick lookup
        const viewsByMessage = new Map();
        for (const v of messageViews) {
          if (!viewsByMessage.has(v.messageId))
            viewsByMessage.set(v.messageId, []);
          viewsByMessage.get(v.messageId).push({
            id: v.user.id,
            name: v.user.name,
            image: v.user.image ?? null,
            seenAt: v.seenAt,
          });
        }

        const formattedMessages = page.map((msg) => {
          const explicit = viewsByMessage.get(msg.id) || [];

          // unique map of other users who've seen this message
          const seenUsersMap = new Map();

          // add explicit viewers
          for (const u of explicit) {
            if (u.id === userId) continue; // exclude requester
            seenUsersMap.set(u.id, {
              id: u.id,
              name: u.name,
              image: u.image,
              seenAt: u.seenAt,
            });
          }

          // add chatSeens whose seenAt >= message.createdAt
          for (const cs of chatSeens) {
            if (cs.seenAt >= msg.createdAt) {
              const u = cs.user ?? { id: cs.userId, name: null, image: null };
              if (u.id === userId) continue;
              if (!seenUsersMap.has(u.id))
                seenUsersMap.set(u.id, {
                  id: u.id,
                  name: u.name,
                  image: u.image ?? null,
                  seenAt: cs.seenAt,
                });
            }
          }

          const seenCount = seenUsersMap.size;
          const seenPreview = Array.from(seenUsersMap.values())
            .slice(0, 3)
            .map((u) => ({
              id: u.id,
              name: u.name,
              image: u.image ?? null,
            }));

          const seenByMe =
            (myChatSeen && myChatSeen.seenAt >= msg.createdAt) ||
            explicit.some((u) => u.id === userId);

          return {
            id: msg.id,
            chatId: msg.chatId,
            senderId: msg.senderId,
            content: msg.content,
            createdAt: msg.createdAt,
            senderName: msg.sender?.name ?? "Unknown",
            senderImage: msg.sender?.image ?? null,
            seenCount,
            seenPreview,
            seenByMe,
            replyTo: msg.replyTo
              ? {
                  id: msg.replyTo.id,
                  senderName: msg.replyTo.sender?.name ?? null,
                  content: msg.replyTo.content,
                }
              : null,
          };
        });

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
      if (socket.data.groupId === groupId && socket.data.userId === userId) {
        console.log("[server] joinGroup ignored (already joined)", {
          groupId,
          userId,
          socketId: socket.id,
        });
        return;
      }
      try {
        console.log(
          "[server] joinGroup received for groupId, userId:",
          groupId,
          userId,
          "socket:",
          socket.id
        );
        // save on socket
        socket.data.userId = userId;
        socket.data.groupId = groupId;

        socket.join(groupId);

        // Broadcast presence info to group (existing timers)
        const current = userTimers.get(userId);
        socket.to(groupId).emit("user-joined", { userId, ...current });

        // Ensure there's a chat for this group
        let chat = await prisma.chat.findFirst({ where: { groupId } });
        if (!chat) {
          chat = await prisma.chat.create({
            data: {
              group: { connect: { id: groupId } },
            },
          });
        }

        // persist chatId on socket and join chat room
        socket.data.chatId = chat.id;
        socket.join(`chat_${chat.id}`);
        console.log(
          `Socket: ${socket.id} & Group: ${groupId} (chat ${chat.id})`
        );

        // --- Upsert ChatSeen for this user to NOW (mark everything up to join time as seen) ---
        if (userId) {
          try {
            const now = new Date();
            console.log("[server] upserting chatSeen for", {
              chatId: chat.id,
              userId,
            });
            await prisma.chatSeen.upsert({
              where: { chatId_userId: { chatId: chat.id, userId } },
              update: { seenAt: now },
              create: { chatId: chat.id, userId, seenAt: now },
            });
            console.log("[server] upserted chatSeen OK for", {
              chatId: chat.id,
              userId,
            });

            // Optionally notify others that this user caught up up to `now`
            const seenByUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { id: true, name: true, image: true },
            });

            // Emit a "bulk" seen event — clients can interpret as "all messages <= seenAt are seen"
            console.log("[server] emitting messagesSeenBulk", {
              chatId: chat.id,
              seenAt: now,
              seenByUser: seenByUser?.id,
            });
            io.to(`chat_${chat.id}`)
              .except(socket.id)
              .emit("messagesSeenBulk", {
                seenByUser,
                seenAt: now,
              });
            socket.emit("messagesSeenBulk", {
              seenByUser,
              seenAt: now,
            });

            // update unread counts (optional)
            emitUnreadCount(chat.id, userId);
          } catch (err) {
            console.error("Error upserting ChatSeen on join:", err);
          }
        }

        // --- Load recent messages (page) and compute seen metadata using ChatSeen + MessageView ---
        const PAGE_SIZE = 50;
        const recent = await prisma.message.findMany({
          where: { chatId: chat.id },
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          include: {
            sender: { select: { name: true, image: true } },
            replyTo: {
              select: {
                id: true,
                content: true,
                sender: { select: { name: true } },
              },
            },
            _count: { select: { views: true } },
          },
        });

        // Compose combined seen info server-side (so client gets consistent seenCount/preview/seenByMe)
        // See getMessages handler for the same logic — reuse that pattern here:
        const messages = recent.reverse(); // earliest => latest in page
        const messageIds = messages.map((m) => m.id);

        // 1) chatSeens for other users
        const chatSeens = await prisma.chatSeen.findMany({
          where: { chatId: chat.id, userId: { not: userId } },
          select: {
            userId: true,
            seenAt: true,
            user: { select: { id: true, name: true, image: true } },
          },
        });

        // 2) explicit messageViews for these messages
        const messageViews = await prisma.messageView.findMany({
          where: { messageId: { in: messageIds } },
          include: { user: { select: { id: true, name: true, image: true } } },
        });

        // 3) the requester's ChatSeen (myChatSeen)
        const myChatSeen = await prisma.chatSeen.findUnique({
          where: { chatId_userId: { chatId: chat.id, userId } },
          select: { seenAt: true },
        });

        // helper: group messageViews by messageId
        const viewsByMessage = new Map();
        for (const v of messageViews) {
          if (!viewsByMessage.has(v.messageId))
            viewsByMessage.set(v.messageId, []);
          viewsByMessage.get(v.messageId).push({
            id: v.user.id,
            name: v.user.name,
            image: v.user.image,
            seenAt: v.seenAt,
          });
        }

        const recentFormatted = messages.map((msg) => {
          // build a unique set of other users who have seen this message (via MessageView OR ChatSeen)
          const seenUsersMap = new Map();

          // explicit messageViews
          const explicit = viewsByMessage.get(msg.id) || [];
          for (const u of explicit) {
            if (u.id === userId) continue; // exclude requester from preview/count
            seenUsersMap.set(u.id, {
              id: u.id,
              name: u.name,
              image: u.image ?? null,
              seenAt: u.seenAt,
            });
          }

          // add users with chatSeen >= msg.createdAt
          for (const cs of chatSeens) {
            if (cs.seenAt >= msg.createdAt) {
              const u = cs.user ?? { id: cs.userId, name: null, image: null };
              if (u.id === userId) continue;
              // prefer existing explicit seenAt if present; otherwise use cs.seenAt
              if (!seenUsersMap.has(u.id))
                seenUsersMap.set(u.id, {
                  id: u.id,
                  name: u.name,
                  image: u.image ?? null,
                  seenAt: cs.seenAt,
                });
            }
          }

          const seenPreview = Array.from(seenUsersMap.values())
            .slice(0, 3)
            .map((u) => ({
              id: u.id,
              name: u.name,
              image: u.image ?? null,
            }));

          const seenCount = seenUsersMap.size;

          const seenByMe =
            (myChatSeen && myChatSeen.seenAt >= msg.createdAt) ||
            explicit.some((u) => u.id === userId);

          return {
            id: msg.id,
            chatId: msg.chatId,
            senderId: msg.senderId,
            content: msg.content,
            createdAt: msg.createdAt,
            senderName: msg.sender?.name ?? "Unknown",
            senderImage: msg.sender?.image ?? null,
            seenCount,
            seenPreview,
            seenByMe,
            replyTo: msg.replyTo
              ? {
                  id: msg.replyTo.id,
                  senderName: msg.replyTo.sender?.name ?? null,
                  content: msg.replyTo.content,
                }
              : null,
          };
        });

        // send the recent messages to requester
        socket.emit("recentMessages", recentFormatted);

        // Track online users (unchanged)
        if (!groupOnlineUsers.has(groupId))
          groupOnlineUsers.set(groupId, new Set());
        groupOnlineUsers.get(groupId).add(userId);
        socketToUserGroup.set(socket.id, { userId, groupId });
        io.to(groupId).emit(
          "online-users",
          Array.from(groupOnlineUsers.get(groupId))
        );
      } catch (err) {
        console.error("Error in joinGroup:", err);
        socket.emit("error", "Failed to join group");
      }
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
    socket.on("typing", async ({ userId, userName }) => {
      // broadcast to everyone _except_ the typer
      const chatDbId = socket.data.chatId;
      if (!chatDbId) return;
      io.to(`chat_${chatDbId}`)
        .except(socket.id)
        .emit("userTyping", { userId, userName });
    });

    socket.on("stopTyping", ({ userId }) => {
      const chatDbId = socket.data.chatId;
      if (!chatDbId) return;
      io.to(`chat_${chatDbId}`)
        .except(socket.id)
        .emit("userStopTyping", { userId });
    });

    socket.on(
      "groupMessage",
      async ({ groupId, fromUserId, text, replyToId }) => {
        const chat = await prisma.chat.findFirst({ where: { groupId } });
        if (!chat) return socket.emit("error", "Chat not found");

        const saved = await prisma.message.create({
          data: {
            chat: { connect: { id: chat.id } },
            sender: { connect: { id: fromUserId } },
            content: text,
            replyTo: replyToId ? { connect: { id: replyToId } } : undefined,
            views: { create: { user: { connect: { id: fromUserId } } } }, // mark sender seen
          },
          include: {
            sender: { select: { id: true, name: true, image: true } },
            replyTo: { include: { sender: { select: { name: true } } } },
          },
        });

        // update unread counts for subscribers (existing)
        const group = await prisma.group.findUnique({
          where: { id: groupId },
          include: { subscribers: true },
        });

        for (const user of group.subscribers) {
          if (user.userId !== fromUserId) emitUnreadCount(chat.id, user.userId);
        }

        // ---- tailored payloads ----
        // Payload for the sender: mark seenByMe=true, but do NOT count the sender
        const payloadForSender = {
          id: saved.id,
          chatId: saved.chatId,
          senderId: saved.senderId,
          content: saved.content,
          createdAt: saved.createdAt,
          senderName: saved.sender.name,
          senderImage: saved.sender.image,
          seenByMe: true, // important for sender UI
          seenCount: 0, // don't count sender in "others"
          seenPreview: [], // empty preview for others (sender excluded)
          replyTo: saved.replyTo
            ? {
                id: saved.replyTo.id,
                senderName: saved.replyTo.sender.name,
                content: saved.replyTo.content,
              }
            : null,
        };

        // Payload for everyone else: they haven't seen it yet
        const payloadForOthers = {
          ...payloadForSender,
          seenByMe: false, // for other clients
          // seenCount and seenPreview remain 0/[] because no other has seen it yet
        };

        // send to sender only
        socket.emit("newMessage", payloadForSender);

        // send to everyone else in the chat room
        io.to(`chat_${chat.id}`)
          .except(socket.id)
          .emit("newMessage", payloadForOthers);
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
