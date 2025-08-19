// lib/notifyGroupParticipants.js

import db from "./db.js";

// helper: chunk array
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * notifyGroupParticipants
 * - sendFcmNotification(tokensArray, title, body, data) => should accept an array of token strings
 */
export async function notifyGroupParticipants({
  groupId,
  message, // saved message object (preferred)
  group, // optional group object (may have subscribers)
  senderId,
  // db, // Prisma client
  sendFcmNotification, // returns sendEachForMulticast response
}) {
  try {
    // --- resolve sender name defensively ---
    let senderName = message?.sender?.name ?? message?.senderName ?? null;
    if (!senderName && (message?.senderId || senderId)) {
      const sid = message?.senderId ?? senderId;
      const s = await db.user.findUnique({
        where: { id: sid },
        select: { name: true },
      });
      senderName = s?.name ?? "Someone";
    }

    // --- resolve participantIds safely ---
    let participantIds = [];
    if (group?.subscribers) {
      const safeSubscribers = (group.subscribers || []).filter(Boolean);

      if (safeSubscribers.length !== (group.subscribers || []).length) {
        console.warn("notifyGroupParticipants: dropped undefined/null entries");
      }

      console.log("DEBUG safeSubscribers sample:", safeSubscribers.slice(0, 5));
      participantIds = safeSubscribers
  .map((s) => s?.userId ?? s?.user?.id ?? null)
  .filter(Boolean);

    } else {
      // fallback: fetch subscribers from DB (only userId needed)
      const g = await db.group.findUnique({
        where: { id: groupId },
        select: { subscribers: { select: { userId: true } } },
      });
      participantIds = (g?.subscribers || []).map((s) => s.userId);
    }

    const excludeId = senderId || message?.senderId || null;
    const recipientIds = participantIds.filter((id) => id !== excludeId);
    if (!recipientIds.length) {
      // nothing to notify
      return;
    }

    // --- fetch recipients with their FcmToken rows (token strings) ---
    const recipients = await db.user.findMany({
      where: { id: { in: recipientIds } },
      select: {
        id: true,
        // select the tokens (array of { token })
        fcmToken: { select: { token: true } },
      },
    });

    // Flatten all token strings into one array
    const tokens = recipients
      .flatMap((r) => (r.fcmToken || []).map((t) => t.token))
      .filter(Boolean);

    if (!tokens.length) {
      console.log("notifyGroupParticipants: no tokens found for recipients");
      return;
    }

    // --- build title & body ---
    const title = `${senderName} in ${group?.name ?? "Group"}`;
    const body =
      message?.content ||
      message?.text ||
      (message?.attachments?.length ? "📎 Attachment" : "");

    // --- send in chunks & clean invalid tokens ---
    const CHUNK_SIZE = 500;
    const tokenChunks = chunkArray(tokens, CHUNK_SIZE);

    for (const chunkTokens of tokenChunks) {
      try {
        // sendFcmNotification should accept an array of token strings as first arg
        const res = await sendFcmNotification(chunkTokens, title, body, {
          groupId: String(groupId),
        });

        // handle cleaning invalid tokens if response follows sendMulticast shape
        if (res && Array.isArray(res.responses)) {
          const invalidTokens = [];
          res.responses.forEach((r, idx) => {
            if (!r.success) {
              const code = r.error?.code ?? "";
              if (
                code === "messaging/registration-token-not-registered" ||
                code === "messaging/invalid-registration-token" ||
                code === "messaging/authentication-error"
              ) {
                invalidTokens.push(chunkTokens[idx]);
              }
            }
          });

          if (invalidTokens.length) {
            console.log("Cleaning invalid tokens:", invalidTokens.length);
            // delete tokens from the FcmToken table (tokens live there)
            await db.fcmToken.deleteMany({
              where: { token: { in: invalidTokens } },
            });
          }
        }
      } catch (err) {
        console.error("FCM chunk send error", err);
      }
    }
  } catch (err) {
    console.error("notifyGroupParticipants error", err);
    return;
  }
}
