// app/api/warning/issue/route.ts
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
  if (!targetUserId || !groupId) {
    return NextResponse.json(
      { error: "Missing targetUserId or groupId" },
      { status: 400 }
    );
  }

  try {
    // create Warning row
    const warning = await db.warning.create({
      data: {
        userId: targetUserId,
        groupId,
        issuedById: session.user.id,
        message: message ?? `You've been issued a warning by ${session.user.name ?? "a moderator"}.`,
      },
    });

    // also create a notification if you want (optional)
    await db.notification.create({
      data: {
        userId: targetUserId,
        type: "WARNING",
        message: message ?? `You've been issued a warning by ${session.user.name ?? "a moderator"}.`,
      },
    });

    // fetch tokens and send FCM (optional)
    const tokenRows = await db.fcmToken.findMany({
      where: { userId: targetUserId },
      select: { token: true },
    });
    const tokens = Array.from(new Set(tokenRows.map((r) => r.token).filter(Boolean)));
    if (tokens.length > 0) {
      const title = "You received a warning";
      const bodyText =
        (message && message.length ? message : "Please review the community rules.") +
        (groupId ? ` (in group ${groupId})` : "");
      try {
        await sendFcmNotification(tokens, title, bodyText, {
          type: "WARNING",
          warningId: warning.id,
          groupId,
          issuerId: session.user.id ?? "",
          url: `/groups/${groupId}`,
        });
      } catch (fcmErr) {
        console.error("[warning] FCM send error:", fcmErr);
      }
    }

    // IMPORTANT: return the created warning so client can update state
    return NextResponse.json({ ok: true, warning }, { status: 201 });
  } catch (err) {
    console.error("DB ERROR (warning issue):", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
