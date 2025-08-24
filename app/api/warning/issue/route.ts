// app/api/warning/route.ts
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { sendFcmNotification } from "@/lib/fcmServer";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { targetUserId, message, groupId } = body;

  if (!targetUserId) {
    return NextResponse.json(
      { error: "Missing targetUserId" },
      { status: 400 }
    );
  }

  try {
    // create a DB notification row (no `metadata` field)
    const notif = await db.notification.create({
      data: {
        userId: targetUserId,
        type: "WARNING",
        message:
          message ??
          `You've been issued a warning by ${
            session.user.name ?? "a moderator"
          }.`,
      },
    });

    // fetch FCM tokens for the target user
    const tokenRows = await db.fcmToken.findMany({
      where: { userId: targetUserId },
      select: { token: true },
    });

    const tokens = Array.from(
      new Set(tokenRows.map((r) => r.token).filter(Boolean))
    );

    if (tokens.length > 0) {
      const title = "You received a warning";
      const bodyText =
        (message && message.length
          ? message
          : "Please review the community rules.") +
        (groupId ? ` (in group ${groupId})` : "");

      try {
        await sendFcmNotification(tokens, title, bodyText, {
          type: "WARNING",
          notificationId: notif.id,
          groupId: groupId ?? "",
          issuerId: session.user.id ?? "",
          url: `/groups/${groupId}`, // or a user profile path if you prefer
        });
        console.log("[warning] FCM sent to", tokens.length, "tokens");
      } catch (fcmErr) {
        console.error("[warning] FCM send error:", fcmErr);
      }
    } else {
      console.log("[warning] No FCM tokens for user", targetUserId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DB ERROR (warning route):", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
