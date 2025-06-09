import db from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const groupId = url.searchParams.get("groupId");

  if (!userId || !groupId)
    return NextResponse.json("User not Found", { status: 404 });

  try {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        subscriptions: {
          where: {
            groupId,
          },
          select: {
            userRole: true,
          },
        },
      },
    });

    console.log("USER (SERVER)", user?.subscriptions[0].userRole);
    
    if (!user) return NextResponse.json("Group not found", { status: 200 });

    const userRole = user.subscriptions[0].userRole;
    console.log("USER Role(server): ", userRole)

    return NextResponse.json(userRole, {
      status: 200,
    });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
