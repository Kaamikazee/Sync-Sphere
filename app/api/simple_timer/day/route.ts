import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
// import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const date = url.searchParams.get("date");
  const session = await getAuthSession();
  const user = session?.user;

  if (!user) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  // Ensure timezone & resetHour exist (fallbacks if missing)
  const timezone = user.timezone ?? "Asia/Kolkata";
  const resetHour = user.resetHour ?? 0;

  // Today's start in UTC (based on user settings)
  const { startUtc: todayUtcStart } = getUserDayRange(
    { timezone, resetHour },
    new Date()
  );

  // Validate `date` param if provided
  if (date && isNaN(new Date(date).getTime())) {
    return NextResponse.json("ERRORS.INVALID_DATE", { status: 400 });
  }

  // If `date` is given, normalize it to start of that user's day in UTC
  const finalDate = date
    ? getUserDayRange({ timezone, resetHour }, new Date(date)).startUtc
    : todayUtcStart;

  try {
    let dailyTotal = await db.dailyTotal.findUnique({
      where: {
        userId_date: {
          userId: userId!,
          date: finalDate,
        },
      },
      select: {
        totalSeconds: true,
        isRunning: true,
        startTimestamp: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const isToday = finalDate.getTime() === todayUtcStart.getTime();

    if (!dailyTotal && isToday) {
      dailyTotal = await db.dailyTotal.create({
        data: {
          userId: userId!,
          date: finalDate,
          totalSeconds: 0,
          isRunning: false,
          startTimestamp: null,
        },
        select: {
          totalSeconds: true,
          isRunning: true,
          startTimestamp: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });
    }

    if (!dailyTotal) {
      return NextResponse.json(0, { status: 200 });
    }

    return NextResponse.json(dailyTotal.totalSeconds, { status: 200 });
  } catch (err) {
    console.error("GET dailyTotal error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
