// app/api/focus_area/day/totals/route.ts
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

  // Pick the base date (user-specified or today)
  const baseDate = date ? new Date(date) : new Date();

  // Get that day's start & end in UTC according to user's timezone/resetHour
  const { startUtc, endUtc } = getUserDayRange(
    { timezone, resetHour },
    baseDate
  );

  const finalDate = date
    ? getUserDayRange({ timezone, resetHour }, new Date(date)).startUtc
    : startUtc;

  try {
    // For future dates, return early with empty response
    const todayStartUtc = getUserDayRange(
      { timezone, resetHour },
      new Date()
    ).startUtc;
    if (finalDate > todayStartUtc) {
      return NextResponse.json([], { status: 200 });
    }

    const focusAreaTotals = await db.timerSegment.groupBy({
      by: ["focusAreaId"],
      where: {
        userId: userId!,
        start: { gte: startUtc },
        end: { lt: endUtc },
      },
      _sum: {
        duration: true,
      },
    });

    const result = focusAreaTotals.map((item) => ({
      focusAreaId: item.focusAreaId,
      totalDuration: item._sum.duration ?? null,
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Focus area fetch error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
