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

    // Upsert token into FcmToken table
    await db.fcmToken.upsert({
      where: { token }, // unique constraint must exist on token
      update: { userId: session.user.id },
      create: { token, userId: session.user.id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push register error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
