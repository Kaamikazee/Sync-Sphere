// server.js
const { createServer } = require("http");
const express = require("express");
const next = require("next");
const { Server } = require("socket.io");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const port = process.env.PORT || 3001;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);

  server.use(cors()); // Required for cross-origin WebSocket connections

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    console.log("🟢 [server] socket connected:", socket.id);

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

        //  --- CHAT HANDLER ---
      } catch {
        console.log(error);
      }
    });

    socket.on("joinGroup", async ({ groupId, userId }) => {
      let chat = await prisma.chat.findFirst({
        where: { groupId },
        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
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
          chatId: chat.id
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
      });
      socket.emit("recentMessages", recent.reverse());
    });

    socket.on("groupMessage", async ({ groupId, fromUserId, text }) => {
      const chat = await prisma.chat.findFirst({
        where: {
          groupId,
        },
      });

      if (!chat) return socket.emit("error", "Chat not found");

      const saved = await prisma.message.create({
        data: {
          chat: { connect: { id: chat.id } },
          sender: { connect: { id: fromUserId } },
          content: text,
        },
      });
      io.to(`chat_${chat.id}`).emit("newMessage", {
        id: saved.id,
        chatId: saved.chatId,
        senderId: saved.senderId,
        content: saved.content,
        createdAt: saved.createdAt,
      });
    });

    socket.on("leaveGroup", async ({ groupId }) => {
      const chat = await prisma.chat.findFirst({ where: { groupId } });
      if (!chat) return;
      socket.leave(`chat_${chat.id}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id); 
    });

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

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

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
