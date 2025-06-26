import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";

export const POST = async (req: Request) => {
  const session = await getAuthSession();
  const userId = session?.user.id;
  const notificationId = await req.json();

  await db.notification.update({
    where: { id: notificationId.notificationId, userId },
    data: { isRead: true },
  });

  return NextResponse.json("Marked as read");
};


export const PUT = async (req: Request) => {
  const session = await getAuthSession();
  const userId = session?.user.id;

  await db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json("All notifications marked as read");
};