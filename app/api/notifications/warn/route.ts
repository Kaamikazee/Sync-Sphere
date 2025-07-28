// import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";

// /api/notifications/warn
export const POST = async (req: Request) => {
  // const session = await getAuthSession();
  // const sender = session?.user;

//   if (!sender || !["ADMIN", "OWNER"].includes(sender.role)) {
//     return NextResponse.json("Unauthorized", { status: 403 });
//   }

  const { targetUserId, warningMsg } = await req.json();

  await db.notification.create({
    data: {
      userId: targetUserId,
      type: "WARNING",
      message: warningMsg,
    },
  });

  return NextResponse.json("Warning sent!", { status: 200 });
};
