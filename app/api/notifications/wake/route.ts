import db from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const POST = async (req: Request) => {
  const session = await getAuthSession();
  const senderId = session?.user.id;
  const { targetUserId, message } = await req.json();

  if (!senderId || !targetUserId) {
    return NextResponse.json("Invalid request", { status: 400 });
  }

  const lastWake = await db.notification.findFirst({
    where: {
      userId: targetUserId,
      type: "WAKE_UP",
      message: message,
      createdAt: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // last 2 hrs
      },
    },
  });

  if (lastWake) {
    return NextResponse.json("Cooldown active", { status: 429, statusText: "You can only wake up a user once every 2 hours." });
  }

  await db.notification.create({
    data: {
      userId: targetUserId,
      type: "WAKE_UP",
      message, // optional: or a message like "You've been woken up!"
    },
  });

  return NextResponse.json("Woken up!", { status: 200 });
};
