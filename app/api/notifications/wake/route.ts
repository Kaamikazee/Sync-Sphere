// app/api/wakeup/route.ts
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { sendFcmNotification } from "@/lib/fcmServer";

export const POST = async (req: Request) => {
  const session = await getAuthSession();
  const senderId = session?.user?.id;

  if (!senderId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { targetUserId, message, groupId } = body;

  if (!targetUserId) {
    return NextResponse.json(
      { error: "Missing targetUserId" },
      { status: 400 }
    );
  }

  if (senderId === targetUserId) {
    return NextResponse.json(
      { error: "You cannot wake yourself up" },
      { status: 400, statusText: "Why would you wake up yourself? huh?" }
    );
  }

  try {
    // Rate-limit: ensure not sent in the last 2 hours with same message
    const lastWake = await db.notification.findFirst({
      where: {
        userId: targetUserId,
        type: "WAKE_UP",
        message: message ?? null,
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours
        },
      },
    });

    if (lastWake) {
      return NextResponse.json({ error: "Cooldown active" }, { status: 429 });
    }

    // create DB notification
    const notif = await db.notification.create({
      data: {
        userId: targetUserId,
        type: "WAKE_UP",
        message: message ?? "You've been woken up!",
      },
    });

    // fetch FCM tokens
    const tokenRows = await db.fcmToken.findMany({
      where: { userId: targetUserId },
      select: { token: true },
    });

    const tokens = Array.from(
      new Set(tokenRows.map((r) => r.token).filter(Boolean))
    );

    if (tokens.length > 0) {
      const title = "Wake-up";
      const bodyText = message ?? "Wake up! Someone is trying to reach you.";

      try {
        await sendFcmNotification(tokens, title, bodyText, {
          type: "WAKE_UP",
          notificationId: notif.id,
          groupId: groupId ?? "",
          senderId,
          url: `/groups/${groupId}`, // or a user profile path if you prefer
        });
        console.log("[wakeup] FCM sent to", tokens.length, "tokens");
      } catch (fcmErr) {
        console.error("[wakeup] FCM send error:", fcmErr);
      }
    } else {
      console.log("[wakeup] No FCM tokens for user", targetUserId);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("DB ERROR (wakeup route):", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
};
