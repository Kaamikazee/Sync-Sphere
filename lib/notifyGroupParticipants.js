// lib/notifyGroupParticipants.js
import db from "./db.js";

/**
 * helper: chunk array into size-limited pieces
 */
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * Notify group participants by FCM
 *
 * params:
 *  - groupId: string
 *  - message: the message object (may be the saved prisma message or minimal info)
 *  - group: optional pre-fetched group (with subscribers or name)
 *  - senderId: id of sender
 *  - sendFcmNotification: function(tokens[], title, body, data, opts)
 *  - singleTokenPerUser: boolean (if true send at most one token per user)
 */
export async function notifyGroupParticipants({
  groupId,
  message,
  group,
  senderId,
  sendFcmNotification,
  singleTokenPerUser = false,
}) {
  try {
    console.log("notifyGroupParticipants called", {
      groupId,
      messageId: message?.id,
      senderId,
      ts: new Date().toISOString(),
    });

    // === resolve senderName defensively ===
    let senderName =
      (message && (message.sender?.name || message.senderName)) || null;
    if (!senderName && (message?.senderId || senderId)) {
      const sid = message?.senderId ?? senderId;
      const s = await db.user.findUnique({
        where: { id: sid },
        select: { name: true },
      });
      senderName = s?.name ?? "Someone";
    }

    // === resolve participant ids ===
    let participantIds = [];
    if (group?.subscribers) {
      const safeSubscribers = (group.subscribers || []).filter(Boolean);
      participantIds = safeSubscribers
        .map((s) => s?.userId ?? s?.user?.id ?? null)
        .filter(Boolean);
    } else {
      const g = await db.group.findUnique({
        where: { id: groupId },
        select: { subscribers: { select: { userId: true } } },
      });
      participantIds = (g?.subscribers || []).map((s) => s.userId);
    }

    participantIds = Array.from(new Set(participantIds || []));

    // exclude sender
    const excludeId = senderId || message?.senderId || null;
    const recipientIds = participantIds.filter((id) => id !== excludeId);
    if (!recipientIds.length) {
      console.log("notifyGroupParticipants: no recipients after excluding sender");
      return;
    }

    // --- load recipient FCM tokens via user records ---
    const recipients = await db.user.findMany({
      where: { id: { in: recipientIds } },
      select: {
        id: true,
        fcmToken: { select: { token: true, id: true, createdAt: true } },
      },
    });

    // flatten records to { userId, token }
    const tokenRecords = recipients.flatMap((r) =>
      (r.fcmToken || []).map((t) => ({ userId: r.id, token: t.token }))
    );

    if (!tokenRecords.length) {
      console.log("notifyGroupParticipants: no fcm tokens found for recipients");
      return;
    }

    // logging + dedupe by token string
    const tokenStrings = tokenRecords.map((tr) => tr.token).filter(Boolean);
    const totalBefore = tokenStrings.length;
    const uniqueBefore = new Set(tokenStrings).size;
    console.log("notifyGroupParticipants token counts", {
      totalBefore,
      uniqueBefore,
      sampleBefore: tokenStrings.slice(0, 8),
    });

    // Option: single token per user
    let tokensDeduped;
    if (singleTokenPerUser) {
      const tokenByUser = new Map();
      for (const rec of tokenRecords) {
        if (!tokenByUser.has(rec.userId) && rec.token) {
          tokenByUser.set(rec.userId, rec.token);
        }
      }
      tokensDeduped = Array.from(new Set(Array.from(tokenByUser.values())));
      console.log("notifyGroupParticipants: singleTokenPerUser =>", tokensDeduped.length);
    } else {
      tokensDeduped = Array.from(new Set(tokenStrings));
      console.log("notifyGroupParticipants: deduped tokens by string =>", tokensDeduped.length);
    }

    if (!tokensDeduped.length) {
      console.log("notifyGroupParticipants: no tokens after dedupe");
      return;
    }

    // --- build title & body ---
    const groupName = group?.name ?? (await db.group.findUnique({ where: { id: groupId }, select: { name: true } })).name ?? "Group";
    const title = `${senderName} in ${groupName}`;
    const body =
      (message && (message.content || message.text)) ||
      (message && message.attachments && message.attachments.length ? "📎 Attachment" : "") ||
      "New message";

    // data payload for SW / client click handling
    const dataPayload = {
      type: "GROUP_MESSAGE",
      groupId: String(groupId),
      chatId: String(message?.chatId ?? ""),
      messageId: String(message?.id ?? ""),
      url: `/groups/${groupId}`,
      senderId: String(senderId ?? message?.senderId ?? ""),
      senderName: String(senderName ?? ""),
    };

    // split into chunks of <= 500 tokens (FCM limit)
    const CHUNK_SIZE = 500;
    const tokenChunks = chunkArray(tokensDeduped, CHUNK_SIZE);

    for (const chunkTokens of tokenChunks) {
      try {
        const res = await sendFcmNotification(
          chunkTokens,
          title,
          body,
          dataPayload,
          {
            onBadTokens: async (badTokens) => {
              try {
                if (badTokens && badTokens.length) {
                  console.log("[notifyGroupParticipants] cleaning bad tokens", badTokens.length);
                  await db.fcmToken.deleteMany({ where: { token: { in: badTokens } } });
                }
              } catch (delErr) {
                console.error("Failed to cleanup bad tokens", delErr);
              }
            },
          }
        );

        // support older "responses" shape (sendEachForMulticast) and newer { badTokens } return
        if (res) {
          // case A: res.responses (the multicast response array)
          if (Array.isArray(res.responses)) {
            const invalidTokens = [];
            res.responses.forEach((r, idx) => {
              if (!r.success) {
                const errCode = r.error?.code ?? "";
                if (
                  errCode === "messaging/registration-token-not-registered" ||
                  errCode === "messaging/invalid-registration-token" ||
                  r.error?.message?.toLowerCase()?.includes("notregistered")
                ) {
                  invalidTokens.push(chunkTokens[idx]);
                }
              }
            });
            if (invalidTokens.length) {
              console.log("notifyGroupParticipants: cleaning invalid tokens (responses)", invalidTokens.length);
              await db.fcmToken.deleteMany({ where: { token: { in: invalidTokens } } });
            }
          }

          // case B: res.badTokens (returned by modern helper)
          if (Array.isArray(res.badTokens) && res.badTokens.length) {
            try {
              console.log("notifyGroupParticipants: cleaning badTokens (returned)", res.badTokens.length);
              await db.fcmToken.deleteMany({ where: { token: { in: res.badTokens } } });
            } catch (err) {
              console.error("Failed to delete badTokens from res.badTokens", err);
            }
          }

          // case C: results may be in res.results[] (batches) -> inspect each
          if (Array.isArray(res.results)) {
            for (const rBatch of res.results) {
              if (rBatch && Array.isArray(rBatch.responses)) {
                const invalid = [];
                rBatch.responses.forEach((r, idx) => {
                  if (!r.success) {
                    const code = r.error?.code ?? "";
                    if (
                      code === "messaging/registration-token-not-registered" ||
                      code === "messaging/invalid-registration-token"
                    ) {
                      invalid.push(chunkTokens[idx]);
                    }
                  }
                });
                if (invalid.length) {
                  console.log("notifyGroupParticipants: cleaning invalid tokens (batch)", invalid.length);
                  await db.fcmToken.deleteMany({ where: { token: { in: invalid } } });
                }
              }
            }
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
