import db from "@/lib/db";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const groupId = url.searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  const today = normalizeToStartOfDay(new Date());
  //   today.setHours(0, 0, 0, 0); // normalize to midnight

  try {
    const membersWithSeconds = await db.subscription.findMany({
      where: {
        groupId,
      },
      include: {
        user: {
          include: {
            dailyTotal: {
              where: { date: today },
              take: 1,
            },
          },
        },
      },
    });

    const membersWithTimer = membersWithSeconds.map((subs) => ({
      user: {
        id: subs.userId,
        name: subs.user.name,
        image: subs.user.image,
        totalSeconds: subs.user.dailyTotal[0]?.totalSeconds ?? 0,
        isRunning: subs.user.dailyTotal[0]?.isRunning ?? false,
        startTimestamp: subs.user.dailyTotal[0]?.startTimestamp ?? null,
      },
    }));

    // // If no record exists, create one
    if (!membersWithSeconds) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(membersWithTimer, { status: 200 });
  } catch (err) {
    console.error("GET dailyTotal error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
