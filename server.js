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

  async function emitUnreadCount(chatId, userId) {
  try {
    const receipt = await prisma.chatReadReceipt.findUnique({
      where: { userId_chatId: { userId, chatId } },
      select: { lastSeenAt: true, lastSeenMessageId: true },
    });

    const baseWhere = { chatId, senderId: { not: userId } };
    let lastSeenAt = receipt?.lastSeenAt;

    // If no lastSeenAt but we have an ID, resolve it once
    if (!lastSeenAt && receipt?.lastSeenMessageId) {
      const msg = await prisma.message.findUnique({
        where: { id: receipt.lastSeenMessageId },
        select: { createdAt: true },
      });
      lastSeenAt = msg?.createdAt || null;

      // Optional: persist it so future queries are faster
      if (lastSeenAt) {
        await prisma.chatReadReceipt.update({
          where: { userId_chatId: { userId, chatId } },
          data: { lastSeenAt },
        });
      }
    }

    let unreadCount;
    if (!lastSeenAt) {
      // No read pointer → all messages unread
      unreadCount = await prisma.message.count({ where: baseWhere });
    } else {
      // Compare using createdAt, which works with UUIDs
      unreadCount = await prisma.message.count({
        where: {
          ...baseWhere,
          createdAt: { gt: lastSeenAt },
        },
      });
    }

    io.to(`chat_${chatId}_${userId}`).emit("chat:updateUnreadCount", {
      chatId,
      userId,
      unreadCount,
    });
  } catch (err) {
    console.error("[emitUnreadCount] error", err);
  }
}



  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    console.log("🟢 [server] socket connected:", socket.id);

    socket.on("joinUnreadRoom", ({ chatId, userId }) => {
      const room = `chat_${chatId}_${userId}`;
      socket.join(room);
    });

    // server.js (or wherever you set up socket.io)
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("getMessageById", async ({ messageId }) => {
    try {
      // Get the message + sender info from DB
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          sender: {
            select: { id: true, name: true, image: true }
          }
        }
      });

      if (!message) {
        socket.emit("messageByIdError", { messageId, error: "Message not found" });
        return;
      }

      // Send back only to the requesting client
      socket.emit("messageById", message);

    } catch (err) {
      console.error("Error fetching message:", err);
      socket.emit("messageByIdError", { messageId, error: "Server error" });
    }
  });
});


    socket.on("getUnreadCount", async ({ chatId, userId }) => {
      if (!chatId || !userId) return;

      await emitUnreadCount(chatId, userId);
    });

    socket.on("chat:subscribe", async ({ chatId, userId }) => {
  console.log(`[chat:subscribe] Joining room chat_${chatId}_${userId}`);
  socket.join(`chat_${chatId}_${userId}`);
  socket.data.subscribedChatId = chatId; // optional flag

  try {
    // send the initial unread count
    await emitUnreadCount(chatId, userId);

    // --- mark the recent page of messages as seen for this user ---
    const PAGE_SIZE = 50;
    const recent = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: { id: true, createdAt: true },
    });

    const recentIds = recent.map(m => m.id);
    const maxCreatedAt = recent.reduce((acc, m) => (m.createdAt > acc ? m.createdAt : acc), new Date(0));
    const latestId = recent.length ? recent[0].id : null;

    if (recentIds.length) {
      // create message view rows (skip duplicates)
      await prisma.messageView.createMany({
        data: recentIds.map(id => ({ userId, messageId: id })),
        skipDuplicates: true,
      });

      // upsert chatReadReceipt to point to newest message seen
      await prisma.chatReadReceipt.upsert({
        where: { userId_chatId: { userId, chatId } },
        create: { userId, chatId, lastSeenAt: maxCreatedAt, lastSeenMessageId: latestId },
        update: { lastSeenAt: maxCreatedAt, lastSeenMessageId: latestId },
      });

      // inform other clients in the chat (except this socket)
      // --- NEW: tell other clients that this user has seen those recent messages ---
      const seenByUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, image: true },
      });

      io.to(`chat_${chatId}`).except(socket.id).emit("messagesSeen", {
        messageIds: recentIds,
        seenByUser,
      });

      // update unread counts for other users as needed
      await emitUnreadCount(chatId, userId);
    }

  } catch (err) {
    console.error("Failed to do subscribe + mark-as-seen:", err);
    socket.emit("chat:updateUnreadCount", { chatId, userId, unreadCount: 0 });
  }
});

    socket.on("chat:unsubscribe", ({ chatId, userId }) => {
      console.log(`[chat:unsubscribe] Leaving room chat_${chatId}_${userId}`);
      socket.leave(`chat_${chatId}_${userId}`);
    });

    socket.on("markMessagesAsSeen", async ({ messageIds }) => {
  const userId = socket.data.userId;
  if (!userId || !Array.isArray(messageIds) || messageIds.length === 0) return;

  // safety limit to avoid huge payloads from client
  const MAX_IDS = 200;
  if (messageIds.length > MAX_IDS) messageIds = messageIds.slice(0, MAX_IDS);

  try {
    // 1) Fetch messages to learn chatId + createdAt for each id
    const msgs = await prisma.message.findMany({
      where: { id: { in: messageIds } },
      select: { id: true, chatId: true, createdAt: true },
    });

    if (!msgs || msgs.length === 0) return;

    // 2) Group message ids by chat and compute max createdAt per chat
    const byChat = new Map(); // chatId -> { ids: [], maxCreatedAt: Date }
    for (const m of msgs) {
      const entry = byChat.get(m.chatId) || { ids: [], maxCreatedAt: new Date(0) };
      entry.ids.push(m.id);
      if (m.createdAt > entry.maxCreatedAt) entry.maxCreatedAt = m.createdAt;
      byChat.set(m.chatId, entry);
    }

    const chatIds = Array.from(byChat.keys());

    // 3) Fetch existing receipts for this user for these chats (to decide update vs no-op)
    const existingReceipts = await prisma.chatReadReceipt.findMany({
      where: { userId, chatId: { in: chatIds } },
      select: { chatId: true, lastSeenAt: true },
    });
    const receiptByChat = new Map(existingReceipts.map(r => [r.chatId, r.lastSeenAt]));

    // 4) For each chat, insert MessageView for that chat's message ids and upsert/update the chat pointer.
    // Use Promise.all to parallelize per-chat work (number of chats per request is usually small).
    await Promise.all(
      chatIds.map(async (chatId) => {
        const { ids, maxCreatedAt } = byChat.get(chatId);

        // insert MessageView rows (bounded: only the visible message ids)
        await prisma.messageView.createMany({
          data: ids.map(id => ({ userId, messageId: id })),
          skipDuplicates: true,
        });

        // update chat pointer: set lastSeenAt to maxCreatedAt, but only if it's newer than existing
        const existing = receiptByChat.get(chatId);
        if (!existing) {
          // create receipt
          await prisma.chatReadReceipt.create({
            data: { userId, chatId, lastSeenAt: maxCreatedAt },
          });
        } else if (existing < maxCreatedAt) {
          // update only if moving forward
          await prisma.chatReadReceipt.update({
            where: { userId_chatId: { userId, chatId } },
            data: { lastSeenAt: maxCreatedAt },
          });
        }

        // load seenByUser info for the emitter (to include in events)
        // you can fetch once per request outside the loop if you prefer
      })
    );

    // 5) After DB changes, emit `messagesSeen` per chat (so other clients update UI)
    const seenByUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true },
    });

    for (const [chatId, { ids }] of byChat.entries()) {
      io.to(`chat_${chatId}`).except(socket.id).emit("messagesSeen", {
        messageIds: ids,
        seenByUser,
      });

      // update unread counts per chat (emitUnreadCount uses the pointer now)
      emitUnreadCount(chatId, userId);
    }

  } catch (error) {
    console.error("❌ Failed to mark messages as seen:", error);
  }
});


    socket.on("getMessageViews", async ({ messageId }) => {
      const views = await prisma.messageView.findMany({
        where: { messageId },
        orderBy: { seenAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, image: true, username: true },
          },
        },
      });

      const payload = views.map((v) => ({
        id: v.user.id,
        name: v.user.name,
        image: v.user.image ?? null,
        seenAt: v.seenAt,
      }));

      socket.emit("messageViews", { messageId, views: payload });
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
        let messages;
        if (beforeMessageId) {
          const ref = await prisma.message.findUnique({
            where: { id: beforeMessageId },
            select: { createdAt: true },
          });
          if (!ref) return;
          messages = await prisma.message.findMany({
            where: {
              chatId,
              createdAt: { lt: ref.createdAt },
            },
            orderBy: { createdAt: "desc" },
            take: PAGE_SIZE,
            include: {
              sender: { select: { name: true, image: true } },
              replyTo: { include: { sender: { select: { name: true } } } },
              // minimal preview
              views: {
                where: { userId: { not: userId } },
                orderBy: { seenAt: "desc" },
                select: {
                  user: { select: { id: true, name: true, image: true } },
                },
              },
              _count: { select: { views: true } },
            },
          });
        } else {
          // similar to above for the first page
          messages = await prisma.message.findMany({
            where: { chatId },
            orderBy: { createdAt: "desc" },
            take: PAGE_SIZE,
            include: {
              sender: { select: { name: true, image: true } },
              replyTo: { include: { sender: { select: { name: true } } } },
              views: {
                where: { userId: { not: userId } },
                orderBy: { seenAt: "desc" },
                select: {
                  user: { select: { id: true, name: true, image: true } },
                },
              },
              _count: { select: { views: true } },
            },
          });
        }

        const formattedMessages = messages.reverse().map((msg) => {
          const allViews = msg.views ?? []; // array of { user: { id, name, image, ... }, seenAt }
          const seenByMe = allViews.some((v) => v.user.id === userId);

          // exclude requester from counts/previews
          const otherViews = allViews.filter((v) => v.user.id !== userId);

          return {
            id: msg.id,
            chatId: msg.chatId,
            senderId: msg.senderId,
            content: msg.content,
            createdAt: msg.createdAt,
            senderName: msg.sender.name,
            senderImage: msg.sender.image,
            seenCount: otherViews.length ?? 0,
            seenPreview: otherViews.slice(0, 3).map((v) => ({
              id: v.user.id,
              name: v.user.name,
              image: v.user.image,
            })),
            seenByMe,
            replyTo: msg.replyTo
              ? {
                  id: msg.replyTo.id,
                  senderName: msg.replyTo.sender.name,
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

  socket.data.userId = userId;
  socket.data.groupId = groupId;
  socket.join(groupId);
  const current = userTimers.get(userId);
  socket.to(groupId).emit("user-joined", { userId, ...current });

  let chat = await prisma.chat.findFirst({ where: { groupId } });
  if (!chat) {
    chat = await prisma.chat.create({
      data: { group: { connect: { id: groupId } } },
    });
  }
  socket.data.chatId = chat.id;
  socket.join(`chat_${chat.id}`);
  console.log(`Socket: ${socket.id} & Group: ${groupId}`);

  const PAGE_SIZE = 50;
  const recent = await prisma.message.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: {
      sender: { select: { name: true, image: true } },
      replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
    },
  });




const recentReversed = recent.reverse();

  // create MessageView rows only for the recent messages (bounded cost)
  const recentIds = recentReversed.map((m) => m.id);
  if (recentIds.length) {
    await prisma.messageView.createMany({
      data: recentIds.map((id) => ({ userId, messageId: id })),
      skipDuplicates: true,
    });
  }

  // fetch all view rows for those recent messageIds (no global `take` here)
  const viewRows = await prisma.messageView.findMany({
    where: { messageId: { in: recentIds } },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { seenAt: "desc" },
  });

  // group views by messageId
  const viewsByMsg = new Map();
  for (const v of viewRows) {
    const arr = viewsByMsg.get(v.messageId) || [];
    arr.push(v);
    viewsByMsg.set(v.messageId, arr);
  }

  // format messages (compute seenPreview and seenCount from the fetched viewRows)
  const recentFormatted = recentReversed.map((msg) => {
    const rows = viewsByMsg.get(msg.id) || [];
    const otherViews = rows.filter((r) => r.user.id !== userId); // exclude requester
    const otherViewsExcludingSender = otherViews.filter((r) => r.user.id !== msg.senderId);

    const seenByMe = true; // pointer + messageView were created above

    return {
      id: msg.id,
      chatId: msg.chatId,
      senderId: msg.senderId,
      content: msg.content,
      createdAt: msg.createdAt,
      senderName: msg.sender?.name ?? "Unknown",
      senderImage: msg.sender?.image ?? null,
      seenCount: otherViewsExcludingSender.length,
      seenPreview: otherViewsExcludingSender.slice(0, 3).map((v) => ({
        id: v.user.id,
        name: v.user.name,
        image: v.user.image ?? null,
      })),
      seenByMe,
      replyTo: msg.replyTo
        ? {
            id: msg.replyTo.id,
            senderName: msg.replyTo.sender.name,
            content: msg.replyTo.content,
          }
        : null,
    };
  });

  // send recent messages to the joining client
socket.emit("recentMessages", recentFormatted);

// immediately tell the joining socket its unread count (usually 0 because pointer was advanced)
try {
  // direct emit so the joining socket sees it instantly even if it hasn't called chat:subscribe yet
  socket.emit("chat:updateUnreadCount", {
    chatId: chat.id,
    userId,
    unreadCount: 0, // pointer was just moved to last message -> 0 unread for joiner
  });
  // also call emitUnreadCount to ensure the per-user room gets the authoritative count
  await emitUnreadCount(chat.id, userId);
} catch (err) {
  console.error("Failed to send unread count after joinGroup:", err);
}


  // --- NEW: tell other clients that this user has seen those recent messages ---
  if (recentIds.length) {
    const seenByUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true },
    });

    // emit only once per message batch; exclude the joiner's socket
    io.to(`chat_${chat.id}`).except(socket.id).emit("messagesSeen", {
      messageIds: recentIds,
      seenByUser,
    });

    // update unread counts for other subscribers (optional: you already call emitUnreadCount elsewhere)
    // emitUnreadCount(chat.id, userId); // not necessary for the joiner, but leaving for clarity
  }

  // Track online users
  if (!groupOnlineUsers.has(groupId)) groupOnlineUsers.set(groupId, new Set());
  groupOnlineUsers.get(groupId).add(userId);
  socketToUserGroup.set(socket.id, { userId, groupId });
  io.to(groupId).emit("online-users", Array.from(groupOnlineUsers.get(groupId)));
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
