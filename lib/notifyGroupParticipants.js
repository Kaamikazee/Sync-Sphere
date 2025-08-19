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

export async function notifyGroupParticipants({
  groupId,
  message,
  group,
  senderId,
  sendFcmNotification,
  // opt-in: if true, send at most one token per user (prefers the first token)
  singleTokenPerUser = false,
}) {
  try {
    console.log("notifyGroupParticipants called", {
      groupId,
      messageId: message?.id,
      senderId,
      ts: new Date().toISOString(),
    });

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

    // make participant ids unique (avoid accidental duplicates)
    participantIds = Array.from(new Set(participantIds));

    const excludeId = senderId || message?.senderId || null;
    const recipientIds = participantIds.filter((id) => id !== excludeId);
    if (!recipientIds.length) {
      return;
    }

    // --- fetch recipients with their FcmToken rows (token strings) ---
    const recipients = await db.user.findMany({
      where: { id: { in: recipientIds } },
      select: {
        id: true,
        fcmToken: { select: { token: true, id: true, createdAt: true } },
      },
    });

    // flatten to records { userId, token }
    const tokenRecords = recipients.flatMap((r) =>
      (r.fcmToken || []).map((t) => ({ userId: r.id, token: t.token }))
    );

    if (!tokenRecords.length) {
      console.log("notifyGroupParticipants: no tokens found for recipients");
      return;
    }

    // debug: counts & duplicates
    const tokenStrings = tokenRecords.map((tr) => tr.token).filter(Boolean);
    const totalBefore = tokenStrings.length;
    const uniqueTokenCount = new Set(tokenStrings).size;
    console.log("notifyGroupParticipants token counts", {
      totalBefore,
      uniqueTokenCount,
      sampleBefore: tokenStrings.slice(0, 8),
    });

    // Option A: dedupe by token string (preserves multiple devices but removes duplicate identical token rows)
    let tokensDeduped = Array.from(new Set(tokenStrings));

    // Option B (optional): limit to single token per user (choose first token seen for that user)
    if (singleTokenPerUser) {
      const tokenByUser = new Map(); // userId -> token
      for (const rec of tokenRecords) {
        if (!tokenByUser.has(rec.userId) && rec.token) {
          tokenByUser.set(rec.userId, rec.token);
        }
      }
      tokensDeduped = Array.from(new Set(Array.from(tokenByUser.values())));
      console.log("notifyGroupParticipants: singleTokenPerUser enabled", {
        tokensAfter: tokensDeduped.length,
      });
    } else {
      console.log("notifyGroupParticipants: deduped tokens by string", {
        tokensAfter: tokensDeduped.length,
      });
    }

    // --- build title & body ---
    const title = `${senderName} in ${group?.name ?? "Group"}`;
    const body =
      message?.content ||
      message?.text ||
      (message?.attachments?.length ? "📎 Attachment" : "");

    // --- send in chunks & clean invalid tokens ---
    const CHUNK_SIZE = 500;
    const tokenChunks = chunkArray(tokensDeduped, CHUNK_SIZE);

    for (const chunkTokens of tokenChunks) {
      try {
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
