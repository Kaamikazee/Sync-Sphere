// app/api/focus_area/day/totals/route.ts
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
import { NextResponse } from "next/server";

/**
 * Split elapsed seconds between user-days.
 *
 * Returns an array of { date: Date (startUtc for that user-day), seconds: number }
 * The `date` returned matches the shape you use for DailyTotal.date (startUtc).
 */
function splitSecondsByUserDay(
  start: Date,
  end: Date,
  timezone: string,
  resetHour: number
): Array<{ date: Date; seconds: number }> {
  if (end <= start) return [];

  const parts: Array<{ date: Date; seconds: number }> = [];

  // cursor walks from start to end
  let cursor = new Date(start);

  while (cursor < end) {
    const { startUtc: dayStartUtc } = getUserDayRange({ timezone, resetHour }, cursor);
    const nextDayStartUtc = new Date(dayStartUtc.getTime() + 24 * 3600 * 1000);

    // the portion of this session that belongs to the current user-day ends at either end or nextDayStartUtc
    const segmentEnd = new Date(Math.min(end.getTime(), nextDayStartUtc.getTime()));

    const secs = Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000);
    const keyDate = new Date(dayStartUtc); // ensure a fresh Date object

    if (secs > 0) {
      parts.push({ date: keyDate, seconds: secs });
    }

    // advance cursor
    cursor = segmentEnd;
  }

  // merge parts for same date (in case of weird boundaries)
  const merged = new Map<string, number>();
  for (const p of parts) {
    const iso = p.date.toISOString();
    merged.set(iso, (merged.get(iso) ?? 0) + p.seconds);
  }

  return Array.from(merged.entries()).map(([iso, seconds]) => ({ date: new Date(iso), seconds }));
}

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
  const { startUtc, endUtc } = getUserDayRange({ timezone, resetHour }, baseDate);

  const finalDate = date
    ? getUserDayRange({ timezone, resetHour }, new Date(date)).startUtc
    : startUtc;

  try {
    // For future dates, return early with empty response
    const todayStartUtc = getUserDayRange({ timezone, resetHour }, new Date() ).startUtc;
    if (finalDate > todayStartUtc) {
      return NextResponse.json([], { status: 200 });
    }

    // Fetch segments that overlap the requested UTC window [startUtc, endUtc).
    // Condition: seg.start < endUtc AND (seg.end IS NULL OR seg.end > startUtc)
    const now = new Date();
    const segments = await db.timerSegment.findMany({
      where: {
        userId: userId!,
        type: "FOCUS",
        AND: [
          { start: { lt: endUtc } },
          {
            OR: [
              { end: null },
              { end: { gt: startUtc } }
            ]
          }
        ]
      },
      select: {
        id: true,
        start: true,
        end: true,
        focusAreaId: true,
      },
    });

    // accumulate per focusAreaId (only for the requested day)
    const map = new Map<string | null, number>();
    for (const seg of segments) {
      const segStart = new Date(seg.start);
      const segEnd = seg.end ? new Date(seg.end) : now; // treat running as now
      const parts = splitSecondsByUserDay(segStart, segEnd, timezone, resetHour);

      for (const p of parts) {
        // only include parts that belong to the requested day
        if (p.date.getTime() === finalDate.getTime()) {
          const key = seg.focusAreaId ?? null;
          map.set(key, (map.get(key) ?? 0) + p.seconds);
        }
      }
    }

    // build result array matching previous shape (focusAreaId + totalDuration)
    const result = Array.from(map.entries()).map(([focusAreaId, totalSeconds]) => ({
      focusAreaId,
      totalDuration: totalSeconds,
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Focus area fetch error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
