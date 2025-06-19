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
      select: {
        group: {
            select: {
                id: true,
                subscribers: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                dailyTotal: {
                                    select: {
                                        totalSeconds: true,
                                        isRunning: true,
                                        startTimestamp: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
      },
    });

     const result = subscriptions.map(subscription => {
      const group = subscription.group;
      return {
        groupId: group.id,
        users: group.subscribers.map(sub => {
          const user = sub.user;
          return {
            id: user.id,
            name: user.name,
            image: user.image,
            totalSeconds: user.dailyTotal[0]?.totalSeconds || 0,
            isRunning: user.dailyTotal[0]?.isRunning || false,
            startTimestamp: user.dailyTotal[0]?.startTimestamp || null,
          };
        }),
      };
    });

    console.log("Servers RESULTTT: ", result);
    

    if (!result) return NextResponse.json([], { status: 200 });

    return NextResponse.json(result, { status: 200 });
  } catch {
    console.log("Servers RESULTTT: ", "ERRROORR");
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
