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
  let cursor = new Date(start);

  while (cursor < end) {
    const { startUtc: dayStartUtc } = getUserDayRange({ timezone, resetHour }, cursor);
    const nextDayStartUtc = new Date(dayStartUtc.getTime() + 24 * 3600 * 1000);

    const segmentEnd = new Date(Math.min(end.getTime(), nextDayStartUtc.getTime()));
    const secs = Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000);

    if (secs > 0) {
      parts.push({ date: new Date(dayStartUtc), seconds: secs });
    }

    cursor = segmentEnd;
  }

  // merge parts
  const merged = new Map<string, number>();
  for (const p of parts) {
    const iso = p.date.toISOString();
    merged.set(iso, (merged.get(iso) ?? 0) + p.seconds);
  }

  return Array.from(merged.entries()).map(([iso, seconds]) => ({
    date: new Date(iso),
    seconds,
  }));
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

  // freeze "now" at the start of request
  const requestNow = new Date();

  const timezone = user.timezone ?? "Asia/Kolkata";
  const resetHour = user.resetHour ?? 0;

  // Pick the base date (user-specified or today)
  const baseDate = date ? new Date(date) : requestNow;

  const { startUtc, endUtc } = getUserDayRange({ timezone, resetHour }, baseDate);

  const finalDate = date
    ? getUserDayRange({ timezone, resetHour }, new Date(date)).startUtc
    : startUtc;

  try {
    const todayStartUtc = getUserDayRange({ timezone, resetHour }, requestNow).startUtc;
    if (finalDate > todayStartUtc) {
      return NextResponse.json([], { status: 200 });
    }

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
        focusAreaId: true,
      },
    });

    // accumulate per focusAreaId
    const map = new Map<string | null, number>();
    for (const seg of segments) {
      const segStart = new Date(seg.start);
      if (!seg.end) continue; // ignore running segments
      const segEnd = new Date(seg.end);

      // clamp to the requested day's window
      const effectiveStart = segStart < startUtc ? startUtc : segStart;
      const effectiveEnd = segEnd > endUtc ? endUtc : segEnd;

      if (effectiveEnd <= effectiveStart) continue;

      const parts = splitSecondsByUserDay(effectiveStart, effectiveEnd, timezone, resetHour);
      for (const p of parts) {
        if (p.date.getTime() === finalDate.getTime()) {
          const key = seg.focusAreaId ?? null;
          map.set(key, (map.get(key) ?? 0) + p.seconds);
        }
      }
    }

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
