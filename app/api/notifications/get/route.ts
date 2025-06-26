import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const session = await getAuthSession()
  //  const url = new URL(request.url);
  // const userId = url.searchParams.get("userId");
  const userId = session?.user.id
  
  if (!userId) return NextResponse.json("No such user found", { status: 404 });

  try {
    const notifications = await db.notification.findMany({
      where: {
        userId: userId,
      },
      orderBy: { createdAt: "desc" },
    });

    

    if (!notifications) return NextResponse.json([], { status: 200 });

    return NextResponse.json(notifications, { status: 200 });
  } catch (err){
    return NextResponse.json(err, { status: 405 });
  }
};
