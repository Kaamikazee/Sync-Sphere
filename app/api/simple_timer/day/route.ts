// app/api/focus_area/day/totals/route.ts
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
import { splitSecondsByUserDay } from "@/utils/splitSecondsByUserDay";
import { NextResponse } from "next/server";

/**
 * Split elapsed seconds between user-days.
 * Returns an array of { date: Date (startUtc for that user-day), seconds: number }.
 */
// function splitSecondsByUserDay(
//   start: Date,
//   end: Date,
//   timezone: string,
//   resetHour: number
// ): Array<{ date: Date; seconds: number }> {
//   if (end <= start) return [];

//   const parts: Array<{ date: Date; seconds: number }> = [];
//   let cursor = new Date(start);

//   while (cursor < end) {
//     const { startUtc: dayStartUtc } = getUserDayRange(
//       { timezone, resetHour },
//       cursor
//     );
//     const nextDayStartUtc = new Date(dayStartUtc.getTime() + 24 * 3600 * 1000);

//     const segmentEnd = new Date(
//       Math.min(end.getTime(), nextDayStartUtc.getTime())
//     );
//     const secs = Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000);

//     if (secs > 0) parts.push({ date: new Date(dayStartUtc), seconds: secs });

//     cursor = segmentEnd;
//   }

//   // merge parts with same date
//   const merged = new Map<string, number>();
//   for (const p of parts) {
//     const iso = p.date.toISOString();
//     merged.set(iso, (merged.get(iso) ?? 0) + p.seconds);
//   }

//   return Array.from(merged.entries()).map(([iso, seconds]) => ({
//     date: new Date(iso),
//     seconds,
//   }));
// }

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const date = url.searchParams.get("date");
  const session = await getAuthSession();
  const user = session?.user;

  if (!user) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  // Freeze "now" at the start of the request (prevents drift between operations)
  const requestNow = new Date();

  // Ensure timezone & resetHour exist (fallbacks if missing)
  const timezone = user.timezone ?? "Asia/Kolkata";
  const resetHour = user.resetHour ?? 0;

  // Today's start in UTC (based on user settings) — use requestNow for consistency
  const { startUtc: todayUtcStart } = getUserDayRange(
    { timezone, resetHour },
    requestNow
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
    // For future dates, return 0
    if (finalDate.getTime() > todayUtcStart.getTime()) {
      return NextResponse.json(0, { status: 200 });
    }

    // Compute the UTC window [startUtc, endUtc) for the requested user-day
    const { startUtc, endUtc } = getUserDayRange(
      { timezone, resetHour },
      finalDate
    );

    // Fetch segments that overlap the requested UTC window:
    // seg.start < endUtc AND (seg.end IS NULL OR seg.end > startUtc)
    const segments = await db.timerSegment.findMany({
      where: {
        userId: userId!,
        type: "FOCUS",
        AND: [
          { start: { lt: endUtc } },
          {
            OR: [{ end: null }, { end: { gt: startUtc } }],
          },
        ],
      },
      select: {
        id: true,
        start: true,
        end: true,
      },
    });

    // Sum only the chunk that belongs to finalDate
    let totalSeconds = 0;
    for (const seg of segments) {
      const segStart = new Date(seg.start);
      // use requestNow (frozen) for running segments
      if (!seg.end) continue; // ignore running segments
      const segEnd = new Date(seg.end);

      // CLAMP the segment to the requested day's window so we never count outside it
      const effectiveStart = segStart < startUtc ? startUtc : segStart;
      const effectiveEnd = segEnd > endUtc ? endUtc : segEnd;

      if (effectiveEnd.getTime() <= effectiveStart.getTime()) continue;

      const parts = splitSecondsByUserDay(
        effectiveStart,
        effectiveEnd,
        timezone,
        resetHour
      );

      for (const p of parts) {
        if (p.date.getTime() === finalDate.getTime()) {
          totalSeconds += p.seconds;
        }
      }
    }

    return NextResponse.json(totalSeconds, { status: 200 });
  } catch (err) {
    console.error("GET dailyTotal error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
