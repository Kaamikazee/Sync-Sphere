// lib/notifyGroupParticipants.js
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
  message, // saved message object (preferred)
  group, // optional group object (may have subscribers)
  senderId,
  db, // Prisma client
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

    // --- resolve participantIds (support both shapes) ---
    let participantIds = [];
    if (group?.subscribers) {
      // 🔎 Debug check for undefined subscribers
      group.subscribers.forEach((s, i) => {
        if (!s) {
          console.error("notifyGroupParticipants: subscriber is undefined at index", i);
        }
      });

      participantIds = group.subscribers
        .map((s) => {
          if (!s) return null;
          return s.userId ?? s.user?.id ?? null;
        })
        .filter(Boolean);
    } else {
      const g = await db.group.findUnique({
        where: { id: groupId },
        select: { subscribers: { select: { userId: true } } },
      });
      participantIds = (g?.subscribers || []).map((s) => s.userId);
    }

    const excludeId = senderId || message?.senderId || null;
    const recipientIds = participantIds.filter((id) => id !== excludeId);
    if (!recipientIds.length) return;

    // --- fetch recipients with tokens ---
    const recipients = await db.user.findMany({
      where: { id: { in: recipientIds }, fcmToken: { not: null } },
      select: { id: true, fcmToken: true },
    });

    const tokens = recipients.map((r) => r.fcmToken).filter(Boolean);
    if (!tokens.length) return;

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
        const res = await sendFcmNotification(chunkTokens, title, body, {
          groupId: String(groupId),
        });

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
            await db.user.updateMany({
              where: { fcmToken: { in: invalidTokens } },
              data: { fcmToken: null },
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
