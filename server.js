// server.js
import "dotenv/config";
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
import { supabaseAdmin, ATTACHMENT_BUCKET } from "./lib/supabaseAdmin.js";
import sharp from "sharp";
import { sendFcmNotification } from "./lib/fcmServer.js";
import { notifyGroupParticipants } from "./lib/notifyGroupParticipants.js";

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);

  server.use(express.static("public"));
  server.use(cors()); // Required for cross-origin WebSocket connections

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });
  global.__io = io;

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

  // --- helpers (place near top of file inside server module, outside io.on if you prefer) ---
  function buildReactionSummary(reactions, currentUserId) {
    // reactions: [{ id, emoji, user: { id, name, image }, createdAt }]
    const map = new Map(); // emoji -> { emoji, users: [], count, reactedByMe }
    for (const r of reactions) {
      const e = r.emoji;
      const entry = map.get(e) || {
        emoji: e,
        users: [],
        count: 0,
        reactedByMe: false,
      };
      entry.users.push({
        id: r.user.id,
        name: r.user.name,
        image: r.user.image ?? null,
      });
      entry.count += 1;
      if (r.user.id === currentUserId) entry.reactedByMe = true;
      map.set(e, entry);
    }
    // create array, include sample users up to 3 for UI
    return Array.from(map.values()).map((v) => ({
      emoji: v.emoji,
      count: v.count,
      reactedByMe: v.reactedByMe,
      sampleUsers: v.users.slice(0, 3),
    }));
  }

  // ---------- server: mute helpers ----------
  /**
   * Returns the active mute record for (userId, groupId) or null.
   * Also removes expired mute rows lazily.
   */
  async function getActiveMute(userId, groupId) {
    // now
    const now = new Date();

    // find a mute that is either indefinite (expiresAt null) OR expires in future
    const mute = await prisma.mute.findFirst({
      where: {
        userId,
        groupId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    // If we found an expired mute (edge-case) remove it (defensive)
    if (mute && mute.expiresAt && mute.expiresAt <= now) {
      try {
        await prisma.mute.delete({ where: { id: mute.id } });
        return null;
      } catch (err) {
        // ignore delete failure - we'll treat as not muted to be safe
        console.warn("Failed to delete expired mute:", err);
        return null;
      }
    }

    // return active mute or null
    return mute || null;
  }

  /**
   * Check if the user is muted for given groupId.
   * Returns the mute record if muted, null otherwise.
   */
  async function isUserMuted(userId, groupId) {
    return await getActiveMute(userId, groupId);
  }

  async function generateThumbnailForAttachment(attachmentId, io) {
    try {
      const att = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        select: {
          id: true,
          storagePath: true,
          chatId: true,
          messageId: true,
          mime: true,
        },
      });
      if (!att) {
        console.warn(
          `[THUMB ${new Date().toISOString()}] attachment not found id=${attachmentId}`
        );
        return null;
      }
      if (!att.storagePath) return null;
      // only handle images (skip otherwise)
      if (!att.mime?.startsWith?.("image/")) return null;

      // download original file from Supabase
      // download original file from Supabase
      const { data: downloadData, error: downloadErr } =
        await supabaseAdmin.storage
          .from(ATTACHMENT_BUCKET)
          .download(att.storagePath);

      if (downloadErr || !downloadData) {
        console.error("thumbnail: download error", downloadErr);
        return null;
      }

      // read file into Buffer (Node)
      const arrayBuffer = await downloadData.arrayBuffer();
      const origBuffer = Buffer.from(arrayBuffer);

      // create thumbnail using sharp (adjust size/quality as you like)
      const thumbBuffer = await sharp(origBuffer)
        .resize({ width: 800, withoutEnlargement: true }) // pick width comfortable for your UI
        .jpeg({ quality: 75 })
        .toBuffer();

      // decide thumb path: original: {groupId}/{id}.ext -> thumb: {groupId}/{id}_thumb.jpg
      // baby-proof: ensure extension .jpg
      const thumbPath = att.storagePath.replace(/(\.\w+)?$/, "_thumb.jpg");

      // upload thumbnail to bucket (upsert true so repeated runs ok)
      // supabaseAdmin.storage.from(...).upload supports Buffer on server
      const { error: uploadErr } = await supabaseAdmin.storage
        .from(ATTACHMENT_BUCKET)
        .upload(thumbPath, thumbBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadErr) {
        console.error(
          `[THUMB ${new Date().toISOString()}] thumbnail upload failed for att=${
            att.id
          }`,
          uploadErr
        );
        return null;
      }

      // update DB row with thumbPath
      await prisma.attachment.update({
        where: { id: att.id },
        data: { thumbPath },
      });

      // create signed URL for the thumbnail so clients can fetch it right away
      let thumbUrl = null;
      try {
        const signed = await makeSignedUrl(thumbPath, 300); // 5min
        thumbUrl = signed;
      } catch (err) {
        console.warn("Failed to create signed thumb URL", err);
      }

      // fetch the up-to-date attachment row (include fields you want to send)
      const updatedAtt = await prisma.attachment.findUnique({
        where: { id: att.id },
        select: {
          id: true,
          storagePath: true,
          thumbPath: true,
          mime: true,
          size: true,
          width: true,
          height: true,
        },
      });

      // if this attachment belongs to a message, emit to its chat room so clients update UI
      if (updatedAtt && att.messageId) {
        // build minimal attachment payload (include thumbUrl we created)
        const payloadAtt = {
          id: updatedAtt.id,
          storagePath: updatedAtt.storagePath,
          thumbPath: updatedAtt.thumbPath,
          thumbUrl,
          mime: updatedAtt.mime,
          size: updatedAtt.size,
          width: updatedAtt.width ?? null,
          height: updatedAtt.height ?? null,
        };

        // find chatId (we stored chatId on attachment row earlier — or use att.chatId)
        const chatId =
          att.chatId ||
          (
            await prisma.message.findUnique({
              where: { id: att.messageId },
              select: { chatId: true },
            })
          ).chatId;

        if (chatId) {
          io.to(`chat_${chatId}`).emit("messageAttachmentUpdated", {
            messageId: att.messageId,
            attachments: [payloadAtt],
          });
        }
      }

      return updatedAtt;
    } catch (err) {
      console.error("generateThumbnailForAttachment error", err);
      return null;
    }
  }

  // helper: create a signed url for a given storage path (returns null on error)
  async function makeSignedUrl(storagePath, expires = 60) {
    try {
      if (!storagePath) return null;
      const { data, error } = await supabaseAdmin.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(storagePath, expires);
      if (error) {
        console.error("createSignedUrl error", error);
        return null;
      }
      return data.signedUrl;
    } catch (err) {
      console.error("makeSignedUrl error", err);
      return null;
    }
  }

  async function attachSignedUrlsToMessages(
    messages,
    opts = { thumbExpires: 120, fileExpires: 60 }
  ) {
    if (!messages || messages.length === 0) return messages;
    // Collect unique paths
    const thumbPaths = new Set();
    const filePaths = new Set();

    for (const m of messages) {
      if (!m.attachments || m.attachments.length === 0) continue;
      for (const a of m.attachments) {
        if (a.thumbPath) {
          thumbPaths.add(a.thumbPath);
        }
        if (a.storagePath) {
          filePaths.add(a.storagePath);
        }
      }
    }

    // Bulk-create signed urls (thumbs) and cache in a map
    const thumbPathArray = Array.from(thumbPaths);
    const thumbUrlMap = {};
    await Promise.all(
      thumbPathArray.map(async (p) => {
        try {
          thumbUrlMap[p] = await makeSignedUrl(p, opts.thumbExpires);
        } catch (err) {
          console.error(
            `[ATTACH-SIGNED ${new Date().toISOString()}] failed to create signed url for thumbPath=${p}`,
            err
          );
          thumbUrlMap[p] = null;
        }
      })
    );

    // File download URL creation is optional/expensive; uncomment if you want immediate download links
    // const fileUrlMap = {};
    // const filePathArray = Array.from(filePaths);
    // await Promise.all(filePathArray.map(async (p) => {
    //   try { fileUrlMap[p] = await makeSignedUrl(p, opts.fileExpires); } catch (err) { fileUrlMap[p] = null; }
    // }));

    // Attach urls to message attachments (mutates messages)
    for (const m of messages) {
      if (!m.attachments || m.attachments.length === 0) continue;
      m.attachments = m.attachments.map((a) => {
        const out = { ...a };
        if (a.thumbPath) out.thumbUrl = thumbUrlMap[a.thumbPath] ?? null;
        // if you enabled file download urls above:
        // if (a.storagePath) out.downloadUrl = fileUrlMap[a.storagePath] ?? null;
        return out;
      });
    }

    return messages;
  }

  // Helper: enqueue thumbnail generation (fire-and-forget)
  function enqueueThumbGeneration(attachmentId, io) {
    // fire-and-forget, but we call the generator and swallow errors
    (async () => {
      try {
        await generateThumbnailForAttachment(attachmentId, io);
      } catch (err) {
        console.error("thumb enqueue failed", err);
      }
    })();
  }

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    console.log("🟢 [server] socket connected:", socket.id);

    // Helper: prefer server-side authenticated user id (socket.data.userId),
    // but fall back to client-supplied id only when necessary.
    const getAuthUserId = (socket, fallbackUserId) => {
      return socket.data?.userId ?? fallbackUserId;
    };

    // ADMIN API: mute a user (durationSeconds optional; until ISO optional)
    socket.on(
      "muteUser",
      async ({ targetUserId, groupId, durationSeconds, until, reason }) => {
        try {
          const actorId = socket.data.userId;
          if (!actorId) return socket.emit("error", "Not authenticated");

          // permission check
          const actorSub = await prisma.subscription.findUnique({
            where: { userId_groupId: { userId: actorId, groupId } },
            select: { userRole: true },
          });
          if (
            !actorSub ||
            (actorSub.userRole !== "ADMIN" && actorSub.userRole !== "OWNER")
          ) {
            return socket.emit("error", "Not allowed to mute users");
          }

          // avoid muting OWNER or protect higher roles: optional check
          const targetSub = await prisma.subscription.findUnique({
            where: { userId_groupId: { userId: targetUserId, groupId } },
            select: { userRole: true },
          });
          if (
            targetSub &&
            targetSub.userRole === "OWNER" &&
            actorSub.userRole !== "OWNER"
          ) {
            return socket.emit("error", "Cannot mute the owner");
          }

          let expiresAt = null;
          if (typeof durationSeconds === "number") {
            expiresAt = new Date(
              Date.now() + Math.max(0, Math.floor(durationSeconds)) * 1000
            );
          } else if (typeof until === "string") {
            const parsed = new Date(until);
            if (!Number.isNaN(parsed.getTime())) expiresAt = parsed;
          }

          // upsert: if a mute already exists, update expiration/reason
          // simpler: delete any existing and create new
          const created = await prisma.mute.upsert({
            where: {
              userId_groupId: {
                // Name = <field1>_<field2>
                userId: targetUserId,
                groupId: groupId,
              },
            },
            update: {
              mutedBy: actorId,
              reason: reason ?? null,
              expiresAt,
            },
            create: {
              userId: targetUserId,
              groupId,
              mutedBy: actorId,
              reason: reason ?? null,
              expiresAt,
            },
          });

          // broadcast to group (so clients update UI)
          io.to(groupId).emit("userMuted", {
            userId: targetUserId,
            mutedBy: actorId,
            reason: created.reason,
            createdAt: created.createdAt,
            expiresAt: created.expiresAt,
          });

          // also notify the target if they are connected (optional)
          // for (const [socketId, s] of io.of("/").sockets) {
          //   // s[1] is the socket instance when iterating entries of Map
          //   if (s.data.userId === targetUserId) {
          //     s.emit("userMuted", {
          //       userId: targetUserId,
          //       mutedBy: actorId,
          //       reason: created.reason,
          //       createdAt: created.createdAt,
          //       expiresAt: created.expiresAt,
          //     });
          //   }
          // }
          // NOTE: depending on your socket.io version, you can find sockets by iterate io.sockets.sockets
          // quick approach: emit to the group room (clients can hide/show mute status), and send ack to muter
          socket.emit("muteUser:ok", {
            userId: targetUserId,
            expiresAt: created.expiresAt,
          });
        } catch (err) {
          console.error("muteUser error:", err);
          socket.emit("error", "Failed to mute user");
        }
      }
    );

    // ADMIN API: unmute a user
    socket.on("unmuteUser", async ({ targetUserId, groupId }) => {
      try {
        const actorId = socket.data.userId;
        if (!actorId) return socket.emit("error", "Not authenticated");

        const actorSub = await prisma.subscription.findUnique({
          where: { userId_groupId: { userId: actorId, groupId } },
          select: { userRole: true },
        });
        if (
          !actorSub ||
          (actorSub.userRole !== "ADMIN" && actorSub.userRole !== "OWNER")
        ) {
          return socket.emit("error", "Not allowed to unmute users");
        }

        // remove mute
        await prisma.mute.deleteMany({
          where: { userId: targetUserId, groupId },
        });

        io.to(groupId).emit("userUnmuted", {
          userId: targetUserId,
          unmutedBy: actorId,
          unmutedAt: new Date(),
        });
        socket.emit("unmuteUser:ok", { userId: targetUserId });
      } catch (err) {
        console.error("unmuteUser error:", err);
        socket.emit("error", "Failed to unmute user");
      }
    });

    // Client can request current muted users for the group
    socket.on("getMutedUsers", async ({ groupId }) => {
      try {
        const now = new Date();
        const rows = await prisma.mute.findMany({
          where: {
            groupId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: {
            userId: true,
            mutedBy: true,
            reason: true,
            createdAt: true,
            expiresAt: true,
          },
        });

        socket.emit("mutedUsers", { users: rows });
      } catch (err) {
        console.error("getMutedUsers error:", err);
        socket.emit("error", "Failed to load muted users");
      }
    });

    // --- simple room join for unread counts (keeps parity with your naming) ---
    socket.on("joinUnreadRoom", ({ chatId, userId: payloadUserId }) => {
      const userId = getAuthUserId(socket, payloadUserId);
      if (!chatId || !userId) return;
      const room = `chat_${chatId}_${userId}`;
      socket.join(room);
    });

    // --- reaction handlers ---
    socket.on(
      "message:react",
      async ({ messageId, emoji, userId: payloadUserId }) => {
        try {
          const userId = getAuthUserId(socket, payloadUserId);
          if (!messageId || !emoji || !userId) {
            return socket.emit("error", "Invalid payload for message:react");
          }

          // upsert user's reaction (requires unique compound index messageId+userId)
          await prisma.messageReaction.upsert({
            where: { messageId_userId: { messageId, userId } },
            update: { emoji, createdAt: new Date() },
            create: { messageId, userId, emoji },
          });

          // fetch full, current reaction list for this message
          const reactions = await prisma.messageReaction.findMany({
            where: { messageId },
            orderBy: { createdAt: "asc" },
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          });

          // find the chatId to emit to the right room
          const message = await prisma.message.findUnique({
            where: { id: messageId },
            select: { chatId: true },
          });
          if (!message) return;

          const summary = buildReactionSummary(reactions, userId);

          // emit the full reaction state for the message
          io.to(`chat_${message.chatId}`).emit("messageReactionUpdated", {
            messageId,
            reactions: reactions.map((r) => ({
              id: r.id,
              emoji: r.emoji,
              createdAt: r.createdAt,
              user: {
                id: r.user.id,
                name: r.user.name,
                image: r.user.image ?? null,
              },
            })),
            summary,
          });
        } catch (err) {
          console.error("[server] message:react error:", err);
          socket.emit("error", "Failed to react to message");
        }
      }
    );

    socket.on(
      "message:unreact",
      async ({ messageId, userId: payloadUserId }) => {
        try {
          const userId = getAuthUserId(socket, payloadUserId);
          if (!messageId || !userId) {
            return socket.emit("error", "Invalid payload for message:unreact");
          }

          await prisma.messageReaction.deleteMany({
            where: { messageId, userId },
          });

          // fetch remaining reactions
          const reactions = await prisma.messageReaction.findMany({
            where: { messageId },
            orderBy: { createdAt: "asc" },
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          });

          const message = await prisma.message.findUnique({
            where: { id: messageId },
            select: { chatId: true },
          });
          if (!message) return;

          const summary = buildReactionSummary(reactions, userId);

          // emit a removal/update event (full payload so clients can replace)
          io.to(`chat_${message.chatId}`).emit("messageReactionRemoved", {
            messageId,
            reactions: reactions.map((r) => ({
              id: r.id,
              emoji: r.emoji,
              createdAt: r.createdAt,
              user: {
                id: r.user.id,
                name: r.user.name,
                image: r.user.image ?? null,
              },
            })),
            summary,
          });
        } catch (err) {
          console.error("[server] message:unreact error:", err);
          socket.emit("error", "Failed to remove reaction");
        }
      }
    );

    // --- single message fetch by id ---
    socket.on("getMessageById", async ({ messageId }) => {
      try {
        // Get the message + sender info from DB
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          include: {
            sender: {
              select: { id: true, name: true, image: true },
            },
            attachments: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                storagePath: true,
                thumbPath: true,
                mime: true,
                size: true,
                width: true,
                height: true,
              },
            },
          },
        });

        if (!message) {
          socket.emit("messageByIdError", {
            messageId,
            error: "Message not found",
          });
          return;
        }
        if (message && message.attachments && message.attachments.length) {
          await attachSignedUrlsToMessages([message], { thumbExpires: 300 });
        }

        // Send back only to the requesting client
        socket.emit("messageById", message);
      } catch (err) {
        console.error("Error fetching message:", err);
        socket.emit("messageByIdError", { messageId, error: "Server error" });
      }
    });

    // --- edit message ---
    socket.on(
      "editMessage",
      async ({ messageId, newContent, userId: payloadUserId, groupId }) => {
        try {
          const userId = getAuthUserId(socket, payloadUserId);

          if (!messageId || typeof newContent !== "string") {
            socket.emit("messageEditError", {
              messageId,
              error: "Invalid payload",
            });
            return;
          }

          const existing = await prisma.message.findUnique({
            where: { id: messageId },
            select: { id: true, senderId: true },
          });

          if (!existing) {
            socket.emit("messageEditError", {
              messageId,
              error: "Message not found",
            });
            return;
          }

          const subscription = await prisma.subscription.findUnique({
            where: {
              userId_groupId: {
                userId,
                groupId,
              },
            },
            select: {
              userRole: true,
            },
          });
          const userRole = subscription?.userRole;

          // basic permission: only sender can edit (extend for admins)
          if (
            existing.senderId !== userId &&
            userRole !== "ADMIN" &&
            userRole !== "OWNER"
          ) {
            socket.emit("messageEditError", {
              messageId,
              error: "Not allowed",
            });
            return;
          }

          const updated = await prisma.message.update({
            where: { id: messageId },
            data: {
              content: newContent,
              updatedAt: new Date(), // Prisma @updatedAt will also do this if configured
              isEdited: true,
            },
            include: {
              sender: { select: { id: true, name: true, image: true } },
            },
          });

          const chatId = updated.chatId;

          // broadcast to room so everyone updates
          console.log(
            "[emit] messageEdited ->",
            `chat_${updated.chatId}`,
            updated.id
          );
          io.to(`chat_${chatId}`).emit("messageEdited", {
            id: updated.id,
            content: updated.content,
            updatedAt: updated.updatedAt,
            isEdited: true, // helpful explicit flag
            editorId: userId,
          });
        } catch (err) {
          console.error("[server] editMessage error:", err);
          socket.emit("messageEditError", { messageId, error: String(err) });
        }
      }
    );

    // --- delete message ---
    socket.on(
      "deleteMessage",
      async ({ messageId, userId: payloadUserId, groupId }) => {
        try {
          const userId = getAuthUserId(socket, payloadUserId);
          if (!messageId) {
            socket.emit("messageDeleteError", {
              messageId,
              error: "Invalid payload",
            });
            return;
          }

          const existing = await prisma.message.findUnique({
            where: { id: messageId },
            select: { id: true, senderId: true },
          });

          if (!existing) {
            socket.emit("messageDeleteError", {
              messageId,
              error: "Message not found",
            });
            return;
          }

          const subscription = await prisma.subscription.findUnique({
            where: {
              userId_groupId: {
                userId,
                groupId,
              },
            },
            select: {
              userRole: true,
            },
          });
          const userRole = subscription?.userRole;

          // permission check: only owner can delete (or admin)
          if (
            existing.senderId !== userId &&
            userRole !== "ADMIN" &&
            userRole !== "OWNER"
          ) {
            socket.emit("messageDeleteError", {
              messageId,
              error: "Not allowed",
            });
            return;
          }

          // soft delete: mark deleted=true and optionally replace content
          const deleted = await prisma.message.update({
            where: { id: messageId },
            data: { isDeleted: true, content: "[deleted]" },
          });

          const chatId = deleted.chatId;

          console.log(
            "[emit] messageDeleted ->",
            `chat_${deleted.chatId}`,
            deleted.id
          );
          io.to(`chat_${chatId}`).emit("messageDeleted", {
            id: deleted.id,
            isDeleted: true,
          });
        } catch (err) {
          console.error("[server] deleteMessage error:", err);
          socket.emit("messageDeleteError", { messageId, error: String(err) });
        }
      }
    );

    // emit unread count helper usage
    socket.on("getUnreadCount", async ({ chatId, userId: payloadUserId }) => {
      const userId = getAuthUserId(socket, payloadUserId);
      if (!chatId || !userId) return;
      await emitUnreadCount(chatId, userId);
    });

    // --- subscribe to chat (and mark recent page as seen) ---
    socket.on("chat:subscribe", async ({ chatId, userId: payloadUserId }) => {
      const userId = getAuthUserId(socket, payloadUserId);
      if (!chatId || !userId) return;

      console.log(`[chat:subscribe] Joining room chat_${chatId}_${userId}`);
      socket.join(`chat_${chatId}_${userId}`);
      socket.data.subscribedChatId = chatId;

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

        const recentIds = recent.map((m) => m.id);
        const maxCreatedAt = recent.reduce(
          (acc, m) => (m.createdAt > acc ? m.createdAt : acc),
          new Date(0)
        );
        const latestId = recent.length ? recent[0].id : null;

        if (recentIds.length) {
          // create message view rows (skip duplicates)
          await prisma.messageView.createMany({
            data: recentIds.map((id) => ({ userId, messageId: id })),
            skipDuplicates: true,
          });

          // upsert chatReadReceipt to point to newest message seen
          // using upsert to avoid races
          await prisma.chatReadReceipt.upsert({
            where: { userId_chatId: { userId, chatId } },
            create: {
              userId,
              chatId,
              lastSeenAt: maxCreatedAt,
              lastSeenMessageId: latestId,
            },
            update: {
              lastSeenAt: maxCreatedAt,
              lastSeenMessageId: latestId,
            },
          });

          // inform other clients in the chat (except this socket)
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
        socket.emit("chat:updateUnreadCount", {
          chatId,
          userId,
          unreadCount: 0,
        });
      }
    });

    socket.on("chat:unsubscribe", ({ chatId, userId: payloadUserId }) => {
      const userId = getAuthUserId(socket, payloadUserId);
      if (!chatId || !userId) return;
      console.log(`[chat:unsubscribe] Leaving room chat_${chatId}_${userId}`);
      socket.leave(`chat_${chatId}_${userId}`);
    });

    // --- markMessagesAsSeen (batch) ---
    socket.on("markMessagesAsSeen", async ({ messageIds }) => {
      const userId = socket.data.userId;
      if (!userId || !Array.isArray(messageIds) || messageIds.length === 0)
        return;

      const MAX_IDS = 200;
      if (messageIds.length > MAX_IDS)
        messageIds = messageIds.slice(0, MAX_IDS);

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
          const entry = byChat.get(m.chatId) || {
            ids: [],
            maxCreatedAt: new Date(0),
          };
          entry.ids.push(m.id);
          if (m.createdAt > entry.maxCreatedAt)
            entry.maxCreatedAt = m.createdAt;
          byChat.set(m.chatId, entry);
        }

        const chatIds = Array.from(byChat.keys());

        // 3) Fetch existing receipts for this user for these chats (to decide update vs no-op)
        const existingReceipts = await prisma.chatReadReceipt.findMany({
          where: { userId, chatId: { in: chatIds } },
          select: { chatId: true, lastSeenAt: true },
        });
        const receiptByChat = new Map(
          existingReceipts.map((r) => [r.chatId, r.lastSeenAt])
        );

        // 4) For each chat, insert MessageView for that chat's message ids and upsert/update the chat pointer.
        await Promise.all(
          chatIds.map(async (chatId) => {
            const { ids, maxCreatedAt } = byChat.get(chatId);

            // insert MessageView rows
            await prisma.messageView.createMany({
              data: ids.map((id) => ({ userId, messageId: id })),
              skipDuplicates: true,
            });

            // update/create chatReadReceipt but only if moving forward (existing < maxCreatedAt)
            const existing = receiptByChat.get(chatId);
            if (!existing) {
              await prisma.chatReadReceipt.create({
                data: {
                  userId,
                  chatId,
                  lastSeenAt: maxCreatedAt,
                  lastSeenMessageId: ids[ids.length - 1] ?? null,
                },
              });
            } else if (existing < maxCreatedAt) {
              await prisma.chatReadReceipt.update({
                where: { userId_chatId: { userId, chatId } },
                data: { lastSeenAt: maxCreatedAt },
              });
            }
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

          // update unread counts per chat
          await emitUnreadCount(chatId, userId);
        }
      } catch (error) {
        console.error("❌ Failed to mark messages as seen:", error);
      }
    });

    // --- getMessageViews (who has seen a specific message) ---
    socket.on("getMessageViews", async ({ messageId }) => {
      try {
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
      } catch (err) {
        console.error("Error fetching message views:", err);
        socket.emit("error", "Could not load message views");
      }
    });

    // --- activity / timer handlers ---
    socket.on("joinUserRoom", ({ userId }) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
    });

    // start-timer: optimistic fast-notify.
    // Client should send: { userId, startTime, focusAreaId? }
    socket.on(
      "start-timer",
      ({ userId: payloadUserId, startTime, focusAreaId }) => {
        try {
          const userId = getAuthUserId(socket, payloadUserId);
          if (!userId) return;

          // Remember which focus is running on this socket (optional convenience)
          if (focusAreaId) socket.data.activeFocusAreaId = focusAreaId;

          console.log("TIMER-STARTED (socket)", {
            userId,
            startTime,
            focusAreaId,
          });

          // Short, compatibility event for listeners that expect it
          io.to(`user:${userId}`).emit("timer-started", {
            userId,
            startTime,
            focusAreaId,
          });

          // Canonical optimistic update payload (clients should reconcile with DB-driven emits)
          io.to(`user:${userId}`).emit("timer:updated", {
            isRunning: true,
            activeFocusAreaId: focusAreaId ?? null,
            totalSeconds: 0, // optimistic; server-side DB upsert will emit authoritative value
            startTime: typeof startTime === "number" ? startTime : Date.now(),
          });
        } catch (err) {
          console.error("start-timer handler error:", err);
        }
      }
    );

    // stop-timer: optimistic fast-notify.
    // Client should send: { userId, totalSeconds?, segmentId? }
    socket.on(
      "stop-timer",
      ({ userId: payloadUserId, totalSeconds, segmentId }) => {
        try {
          const userId = getAuthUserId(socket, payloadUserId);
          if (!userId) return;

          // clear socket-level focus marker
          socket.data.activeFocusAreaId = null;

          console.log("TIMER-STOPPED (socket)", {
            userId,
            totalSeconds,
            segmentId,
          });

          // Compatibility short event
          io.to(`user:${userId}`).emit("timer-stopped", {
            userId,
            totalSeconds,
            segmentId,
          });

          // Canonical optimistic update — serverside DB route should still emit final `timer:updated`.
          io.to(`user:${userId}`).emit("timer:updated", {
            isRunning: false,
            activeFocusAreaId: null,
            totalSeconds:
              typeof totalSeconds === "number" ? totalSeconds : null,
            startTime: null,
          });
        } catch (err) {
          console.error("stop-timer handler error:", err);
        }
      }
    );

    // tick: receive periodic tick from client and forward to the user's room.
    // Client should send: { userId, currentTotalSeconds }
    socket.on("tick", ({ userId: payloadUserId, currentTotalSeconds }) => {
      try {
        const userId = getAuthUserId(socket, payloadUserId);
        if (!userId) return;

        const activeFocusAreaId = socket.data.activeFocusAreaId ?? null;

        // forward tick only to that user's rooms (not everyone)
        io.to(`user:${userId}`).emit("timer-tick", {
          userId,
          currentTotalSeconds,
          activeFocusAreaId,
          // don't try to be authoritative here — these are just ticks
        });

        // Optional: also emit a canonical "timer:updated" with the tick value if you want clients to
        // treat ticks as authoritative for display. If you do, include the same payload shape:
        // io.to(`user:${userId}`).emit("timer:updated", {
        //   isRunning: true,
        //   activeFocusAreaId,
        //   totalSeconds: currentTotalSeconds,
        //   startTime: null,
        // });
      } catch (err) {
        console.error("tick handler error:", err);
      }
    });

    //
    // Activity events (use activity rooms so only clients that care receive updates)
    //
    socket.on("startActivity", async ({ activityId, startTime }) => {
      try {
        console.log("Activity started:", activityId);
        const activity = await prisma.activity.findUnique({
          where: { id: activityId },
        });
        const baseline = activity?.timeSpent ?? 0;

        // Join activity room for subscribers (optional)
        socket.join(`activity:${activityId}`);

        // Emit to activity room
        io.to(`activity:${activityId}`).emit("activityStarted", {
          activityId,
          startTime,
          baseline,
        });
      } catch (error) {
        console.error("Error starting activity:", error);
      }
    });

    socket.on("updateTimer", async ({ activityId, elapsedTime }) => {
      try {
        await prisma.activity.update({
          where: { id: activityId },
          data: { timeSpent: elapsedTime },
        });
        io.to(`activity:${activityId}`).emit("timerUpdated", {
          activityId,
          elapsedTime,
        });
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
        io.to(`activity:${activityId}`).emit("activityStopped", {
          activityId,
          elapsedTime,
        });
      } catch (error) {
        console.error("Error stopping activity:", error);
      }
    });

    socket.on("timer:updated", (payload) => {
      const { userId } = payload;
      io.to(`user:${userId}`).emit("timer:updated", payload);
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
              reactions: {
                orderBy: { createdAt: "asc" },
                include: {
                  user: { select: { id: true, name: true, image: true } },
                },
              },
              views: {
                where: { userId: { not: userId } },
                orderBy: { seenAt: "desc" },
                select: {
                  user: { select: { id: true, name: true, image: true } },
                },
              },
              _count: { select: { views: true } },
              attachments: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  storagePath: true,
                  thumbPath: true,
                  mime: true,
                  size: true,
                  width: true,
                  height: true,
                },
              },
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
              reactions: {
                orderBy: { createdAt: "asc" },
                include: {
                  user: { select: { id: true, name: true, image: true } },
                },
              },
              views: {
                where: { userId: { not: userId } },
                orderBy: { seenAt: "desc" },
                select: {
                  user: { select: { id: true, name: true, image: true } },
                },
              },
              _count: { select: { views: true } },
              attachments: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  storagePath: true,
                  thumbPath: true,
                  mime: true,
                  size: true,
                  width: true,
                  height: true,
                },
              },
            },
          });
        }

        // messages come back newest-first (desc). We'll flip them to oldest-first before sending.
        const page = messages.slice().reverse(); // non-destructive reverse

        // Attach signed URLs for all attachments in this page (bulk)
        await attachSignedUrlsToMessages(page, { thumbExpires: 300 });

        // Map synchronously now that thumbUrl fields are present
        const formattedMessages = page.map((msg) => {
          const allViews = msg.views ?? [];
          const seenByMe = allViews.some((v) => v.user.id === userId);
          const otherViews = allViews.filter((v) => v.user.id !== userId);

          return {
            id: msg.id,
            chatId: msg.chatId,
            senderId: msg.senderId,
            content: msg.content,
            createdAt: msg.createdAt,
            isEdited: msg.isEdited,
            isDeleted: msg.isDeleted,
            whenEdited: msg.updatedAt,
            senderName: msg.sender.name,
            senderImage: msg.sender.image,
            attachments: (msg.attachments || []).map((a) => ({
              id: a.id,
              storagePath: a.storagePath,
              thumbPath: a.thumbPath ?? null,
              thumbUrl: a.thumbUrl ?? null,
              mime: a.mime,
              size: a.size,
              width: a.width ?? null,
              height: a.height ?? null,
            })),
            reactions: (msg.reactions || []).map((r) => ({
              id: r.id,
              emoji: r.emoji,
              createdAt: r.createdAt,
              user: r.user
                ? {
                    id: r.user.id,
                    name: r.user.name,
                    image: r.user.image ?? null,
                  }
                : null,
            })),
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

        // Emit the fully-resolved, plain object array
        socket.emit("olderMessages", formattedMessages);
      } catch (error) {
        console.error("Error in getMessages:", error);
        socket.emit("error", "Failed to load older messages");
      }
    });

    // --- TOTAL TIME HANDLER ---
    socket.on("getAllTotals", async ({ groupId }) => {
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

    //  --- CHAT HANDLER: joinGroup (setup chat, join rooms, send recent messages) ---
    socket.on("joinGroup", async ({ groupId, userId: payloadUserId }) => {
      try {
        const userId = getAuthUserId(socket, payloadUserId);
        if (!groupId || !userId) {
          return socket.emit(
            "error",
            "Missing groupId or userId for joinGroup"
          );
        }

        console.log("Group Joined", groupId);

        // set data (use server-side userId if available)
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
            replyTo: {
              select: {
                id: true,
                content: true,
                sender: { select: { name: true } },
              },
            },
            reactions: {
              orderBy: { createdAt: "asc" },
              include: {
                user: { select: { id: true, name: true, image: true } },
              },
            },
            attachments: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                storagePath: true,
                thumbPath: true,
                mime: true,
                size: true,
                width: true,
                height: true,
              },
            },
          },
        });

        const recentReversed = recent.reverse();
        await attachSignedUrlsToMessages(recentReversed, { thumbExpires: 300 });

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
          const otherViewsExcludingSender = otherViews.filter(
            (r) => r.user.id !== msg.senderId
          );

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
            isEdited: msg.isEdited,
            isDeleted: msg.isDeleted,
            whenEdited: msg.updatedAt,
            attachments: (msg.attachments || []).map((a) => ({
              id: a.id,
              storagePath: a.storagePath,
              thumbPath: a.thumbPath ?? null,
              thumbUrl: a.thumbUrl ?? null,
              mime: a.mime,
              size: a.size,
              width: a.width ?? null,
              height: a.height ?? null,
            })),
            reactions: (msg.reactions || []).map((r) => ({
              id: r.id,
              emoji: r.emoji,
              createdAt: r.createdAt,
              user: r.user
                ? {
                    id: r.user.id,
                    name: r.user.name,
                    image: r.user.image ?? null,
                  }
                : null,
            })),

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

        // --- tell other clients that this user has seen those recent messages ---
        if (recentIds.length) {
          const seenByUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, image: true },
          });

          io.to(`chat_${chat.id}`).except(socket.id).emit("messagesSeen", {
            messageIds: recentIds,
            seenByUser,
          });
        }

        // Track online users
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

    // typing indicators
    socket.on("typing", async ({ userId: payloadUserId, userName }) => {
      const actorId = getAuthUserId(socket, payloadUserId);
      const chatDbId = socket.data.chatId;
      const groupId = socket.data.groupId || socket.data.groupId;
      if (!chatDbId) return;
      console.log("TYPING", { userId: actorId, userName });

      // enforce mute (don't broadcast typing if muted)
      const mute = await isUserMuted(actorId, groupId);
      if (mute) {
        // optionally notify the muted user that they are muted (ack or event)
        socket.emit("muted", {
          message: "You are muted",
          expiresAt: mute.expiresAt,
        });
        return;
      }

      io.to(`chat_${chatDbId}`)
        .except(socket.id)
        .emit("userTyping", { userId: actorId, userName });
    });

    socket.on("stopTyping", ({ userId: payloadUserId }) => {
      const actorId = getAuthUserId(socket, payloadUserId);
      const chatDbId = socket.data.chatId;
      if (!chatDbId) return;
      console.log("STOP TYPING", { userId: actorId });
      io.to(`chat_${chatDbId}`)
        .except(socket.id)
        .emit("userStopTyping", { userId: actorId });
    });

    // --- group message send ---
    socket.on(
      "groupMessage",
      async ({
        groupId,
        fromUserId: payloadFromUserId,
        text,
        replyToId,
        attachments: attachmentIds,
      }) => {
        try {
          const fromUserId = getAuthUserId(socket, payloadFromUserId);

          const mute = await isUserMuted(fromUserId, groupId);
          if (mute) {
            // tell sender they're muted (client can show UI)
            socket.emit("muted", {
              message: "You are muted and cannot send messages.",
              expiresAt: mute.expiresAt,
              mutedBy: mute.mutedBy,
              reason: mute.reason ?? null,
            });
            return;
          }

          const chat = await prisma.chat.findFirst({ where: { groupId } });
          if (!chat) return socket.emit("error", "Chat not found");

          const saved = await prisma.message.create({
            data: {
              chat: { connect: { id: chat.id } },
              sender: { connect: { id: fromUserId } },
              content: text,
              replyTo: replyToId ? { connect: { id: replyToId } } : undefined,
              views: { create: { user: { connect: { id: fromUserId } } } }, // mark sender seen
              attachments:
                attachmentIds && attachmentIds.length
                  ? { connect: attachmentIds.map((id) => ({ id })) }
                  : undefined,
            },
            include: {
              sender: { select: { id: true, name: true, image: true } },
              replyTo: { include: { sender: { select: { name: true } } } },
              reactions: {
                orderBy: { createdAt: "asc" },
                include: {
                  user: { select: { id: true, name: true, image: true } },
                },
              },
              attachments: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  storagePath: true,
                  thumbPath: true,
                  mime: true,
                  size: true,
                  width: true,
                  height: true,
                },
              },
            },
          });

          // defensive: link attachments to message row
          if (attachmentIds && attachmentIds.length) {
            await prisma.attachment.updateMany({
              where: { id: { in: attachmentIds } },
              data: { messageId: saved.id },
            });

            // enqueue thumbnail generation for image attachments
            const imageAtts = await prisma.attachment.findMany({
              where: {
                id: { in: attachmentIds },
                mime: { startsWith: "image/" },
              },
            });
            imageAtts.forEach((a) => {
              enqueueThumbGeneration(a.id, io); // ensure you pass io if needed
            });
          }

          // attach signed thumb urls to the saved message for immediate broadcast (optional)
          if (saved.attachments && saved.attachments.length) {
            await attachSignedUrlsToMessages([saved], { thumbExpires: 300 });
          }

          // build payloadForSender & payloadForOthers, include attachments mapping
          const mapAttachments = (arr) =>
            (arr || []).map((a) => ({
              id: a.id,
              storagePath: a.storagePath,
              thumbPath: a.thumbPath ?? null,
              thumbUrl: a.thumbUrl ?? null,
              mime: a.mime,
              size: a.size,
              width: a.width ?? null,
              height: a.height ?? null,
            }));

          // update unread counts for subscribers (existing)
          const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: {
              subscribers: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
                      fcmToken: true, // 👈 include this if you need it in notifyGroupParticipants
                    },
                  },
                },
              },
            },
          });

          if (group?.subscribers) {
            for (const user of group.subscribers) {
              if (user.userId !== fromUserId)
                emitUnreadCount(chat.id, user.userId);
            }
          }
          const notifUrl = `/groups/${groupId}`;

          await notifyGroupParticipants({
            type: "GROUP_MESSAGE",
            groupId,
            message: saved, // the saved message object you already created
            group, // the group object you already fetched earlier
            senderId: fromUserId, // sender id from your handler
            // prisma, // your prisma client (db or prisma)
            sendFcmNotification, // imported helper from lib/fcmServer
            url: notifUrl, // <<--- important: service worker will read this
          });

          // ---- tailored payloads ----
          const payloadForSender = {
            id: saved.id,
            chatId: saved.chatId,
            senderId: saved.senderId,
            content: saved.content,
            isEdited: saved.isEdited,
            isDeleted: saved.isDeleted,
            whenEdited: saved.updatedAt,
            createdAt: saved.createdAt,
            senderName: saved.sender.name,
            senderImage: saved.sender.image,
            seenByMe: true,
            seenCount: 0,
            seenPreview: [],
            reactions: (saved.reactions || []).map((r) => ({
              id: r.id,
              emoji: r.emoji,
              createdAt: r.createdAt,
              user: r.user
                ? {
                    id: r.user.id,
                    name: r.user.name,
                    image: r.user.image ?? null,
                  }
                : null,
            })),
            replyTo: saved.replyTo
              ? {
                  id: saved.replyTo.id,
                  senderName: saved.replyTo.sender.name,
                  content: saved.replyTo.content,
                }
              : null,
            attachments: mapAttachments(saved.attachments),
          };

          const payloadForOthers = {
            ...payloadForSender,
            seenByMe: false,
          };

          // send to sender only
          socket.emit("newMessage", payloadForSender);

          // broadcast to everyone else in the chat room
          io.to(`chat_${chat.id}`)
            .except(socket.id)
            .emit("newMessage", payloadForOthers);
        } catch (err) {
          console.error("Error handling groupMessage:", err);
          socket.emit("error", "Failed to send message");
        }
      }
    );

    // --- leave group ---
    socket.on("leaveGroup", async ({ groupId, userId: payloadUserId }) => {
      try {
        const userId = getAuthUserId(socket, payloadUserId);
        const chat = await prisma.chat.findFirst({ where: { groupId } });
        if (!chat) return;
        socket.leave(`chat_${chat.id}`);
        socket.leave(groupId);

        if (groupOnlineUsers.has(groupId)) {
          groupOnlineUsers.get(groupId).delete(userId);
          io.to(groupId).emit(
            "online-users",
            Array.from(groupOnlineUsers.get(groupId))
          );
        }
        socketToUserGroup.delete(socket.id);
      } catch (err) {
        console.error("Error leaving group:", err);
      }
    });

    // --- disconnect handler ---
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
