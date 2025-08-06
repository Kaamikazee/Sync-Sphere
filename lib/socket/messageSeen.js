// messageSeen.js

import db from "../db";


const handleMessageSeen = async (socket) => {
  socket.on("message:seen", async ({ messageId, groupId }) => {
    const userId = socket.user?.id;
    if (!userId) return;

    try {
      await db.seenMessage.upsert({
        where: {
          userId_messageId: {
            userId,
            messageId,
          },
        },
        update: {
          seenAt: new Date(),
        },
        create: {
          userId,
          messageId,
        },
      });

      // Optionally broadcast to others in the group
      socket.to(groupId).emit("message:updateSeen", {
        messageId,
        userId,
      });
    } catch (err) {
      console.error("Seen update failed:", err);
    }
  });
};

export default handleMessageSeen;