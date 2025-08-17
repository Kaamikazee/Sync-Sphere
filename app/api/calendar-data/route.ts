// app/api/focus_area/day/logs/route.ts  (or where your original file lives)
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
import { NextResponse } from "next/server";

/**
 * Split elapsed seconds between user-days.
 * Returns an array of { date: Date (startUtc for that user-day), seconds: number }.
 */
function splitSecondsByUserDay(
  start: Date,
  end: Date,
  timezone: string,
  resetHour: number
): Array<{ date: Date; seconds: number }> {
  if (end <= start) return [];

  const parts: Array<{ date: Date; seconds: number }> = [];
  let cursor = new Date(start);

  while (cursor < end) {
    const { startUtc: dayStartUtc } = getUserDayRange({ timezone, resetHour }, cursor);
    const nextDayStartUtc = new Date(dayStartUtc.getTime() + 24 * 3600 * 1000);

    const segmentEnd = new Date(Math.min(end.getTime(), nextDayStartUtc.getTime()));
    const secs = Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000);

    if (secs > 0) parts.push({ date: new Date(dayStartUtc), seconds: secs });

    cursor = segmentEnd;
  }

  // merge parts with same date
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

  if (!userId) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  try {
    // Fetch user's timezone/resetHour if available (otherwise fallbacks)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { timezone: true, resetHour: true },
    });
    const timezone = user?.timezone ?? "Asia/Kolkata";
    const resetHour = user?.resetHour ?? 0;

    // Fetch all FOCUS segments for the user (include running segments - treated as ending now)
    // If you want to limit the date range (for performance), add a WHERE clause here.
    const now = new Date();
    const segments = await db.timerSegment.findMany({
      where: {
        userId,
        type: "FOCUS",
      },
      select: {
        start: true,
        end: true,
      },
      orderBy: { start: "asc" },
    });

    // Accumulate seconds per user-day (keyed by ISO startUtc)
    const map = new Map<string, number>();

    for (const seg of segments) {
      const segStart = new Date(seg.start);
      const segEnd = seg.end ? new Date(seg.end) : now;
      if (segEnd <= segStart) continue;

      const parts = splitSecondsByUserDay(segStart, segEnd, timezone, resetHour);
      for (const p of parts) {
        const iso = p.date.toISOString();
        map.set(iso, (map.get(iso) ?? 0) + p.seconds);
      }
    }

    // Convert map to sorted array of { date, totalSeconds }
    const result = Array.from(map.entries())
      .map(([iso, totalSeconds]) => ({ date: new Date(iso), totalSeconds }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("GET dailyTotal error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
