import db from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);

  const groupId = url.searchParams.get("groupId");

  if (!groupId ) return NextResponse.json("ERRORS.NO_USER_API", { status: 404 });

  try {
    const groupMembers = await db.subscription.findMany({
      where: {
        groupId: groupId
      },
      select: {
        userId: true,
        user: {
          select: {
            name: true,
            image: true
          }
        }
      }
    });

    if (!groupMembers) {
      return NextResponse.json("not found", { status: 200 });
    }

    const userIds = groupMembers.map((m) => m.userId)

    const activityTotals = await db.activity.groupBy({
      by: ["userId"],
      where: {
        userId: {in: userIds},
      },
      _sum: {
        timeSpent: true
      }
    })

    const result = groupMembers.map ((member) => {
      const total = activityTotals.find ((a) => a.userId === member.userId)?._sum.timeSpent || 0;

      return {
        userId: member.userId,
        name: member.user.name,
        image: member.user.image,
        totalTime: total
      }
    })

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};