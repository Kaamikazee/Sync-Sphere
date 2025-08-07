import db from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) return NextResponse.json("No such user found", { status: 404 });

  try {
    const subscriptions = await db.subscription.findMany({
      where: {
        userId,
      },
      include: {
        group: {
          include: {
            chat: {
              select: {
                id: true,
              }
            },
            creator: {
              select: {
                name: true,
              },
            },
          }
        },
        user: {
          select: {
            name: true,
          }
        }
      },
      
      orderBy: {
        group: {
          createdAt: "desc",
        },
      },
    });


    // Attach user name to each group object
   const groupsWithUserName = subscriptions.map((subscription) => {
  const {
    creator,
    ...groupWithoutCreator
  } = subscription.group;

  return {
    ...groupWithoutCreator,
    userName: subscription.user?.name || null,
    creatorName: creator?.name || null,
    chatId: subscription.group.chat[0].id
  };
});


    if (!groupsWithUserName) return NextResponse.json([], { status: 200 });

    return NextResponse.json(groupsWithUserName, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
