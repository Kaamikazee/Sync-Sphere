// app/api/push/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // Store or update user’s FCM token
    await db.user.update({
      where: { id: session.user.id },
      data: { fcmToken: token },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push register error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
