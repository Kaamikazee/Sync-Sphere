// app/api/segments/get/route.ts  (drop-in replacement)
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
import { NextResponse } from "next/server";

/**
 * Split elapsed seconds between user-days.
 * Returns an array of { date: Date (startUtc for that user-day), seconds: number, segmentStart, segmentEnd }.
 */
function splitSecondsByUserDay(
  start: Date,
  end: Date,
  timezone: string,
  resetHour: number
): Array<{ date: Date; seconds: number; segmentStart: Date; segmentEnd: Date }> {
  if (end <= start) return [];

  const parts: Array<{ date: Date; seconds: number; segmentStart: Date; segmentEnd: Date }> = [];
  let cursor = new Date(start);

  while (cursor < end) {
    const { startUtc: dayStartUtc } = getUserDayRange({ timezone, resetHour }, cursor);
    const nextDayStartUtc = new Date(dayStartUtc.getTime() + 24 * 3600 * 1000);

    const segmentEnd = new Date(Math.min(end.getTime(), nextDayStartUtc.getTime()));
    const secs = Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000);

    if (secs > 0) {
      parts.push({
        date: new Date(dayStartUtc),
        seconds: secs,
        segmentStart: new Date(cursor),
        segmentEnd: new Date(segmentEnd),
      });
    }

    cursor = segmentEnd;
  }

  // merge parts for same date (shouldn't usually be necessary but kept for safety)
  const merged = new Map<
    string,
    { seconds: number; segmentStart: Date; segmentEnd: Date }
  >();
  for (const p of parts) {
    const iso = p.date.toISOString();
    if (!merged.has(iso)) {
      merged.set(iso, { seconds: p.seconds, segmentStart: p.segmentStart, segmentEnd: p.segmentEnd });
    } else {
      const cur = merged.get(iso)!;
      const startMin = cur.segmentStart.getTime() < p.segmentStart.getTime() ? cur.segmentStart : p.segmentStart;
      const endMax = cur.segmentEnd.getTime() > p.segmentEnd.getTime() ? cur.segmentEnd : p.segmentEnd;
      merged.set(iso, { seconds: cur.seconds + p.seconds, segmentStart: startMin, segmentEnd: endMax });
    }
  }

  return Array.from(merged.entries()).map(([iso, val]) => ({
    date: new Date(iso),
    seconds: val.seconds,
    segmentStart: val.segmentStart,
    segmentEnd: val.segmentEnd,
  }));
}

export const GET = async (request: Request) => {
  const url = new URL(request.url);

  const userId = url.searchParams.get("userId");
  const dateParam = url.searchParams.get("date");
  const session = await getAuthSession();
  const user = session?.user;

  if (!user) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  // Ensure timezone & resetHour exist
  const timezone = user.timezone ?? "Asia/Kolkata";
  const resetHour = user.resetHour ?? 0;

  // Pick the base date (user-specified or today)
  const baseDate = dateParam ? new Date(dateParam) : new Date();

  // Get that day's start & end in UTC according to user's timezone/resetHour
  const { startUtc, endUtc } = getUserDayRange({ timezone, resetHour }, baseDate);

  try {
    // ---- OVERLAP-BASED: fetch segments that overlap the requested user-day window ----
    // Condition: seg.start < endUtc AND (seg.end IS NULL OR seg.end > startUtc)
    const now = new Date();
    const segments = await db.timerSegment.findMany({
      where: {
        userId: userId!,
        AND: [
          { start: { lt: endUtc } },
          {
            OR: [
              { end: null },
              { end: { gt: startUtc } }
            ]
          }
        ],
      },
      orderBy: { start: "asc" },
      include: {
        focusArea: true,
      },
    });

    const finalDate = getUserDayRange({ timezone, resetHour }, baseDate).startUtc;

    // Build simplified list: only include the clipped portion for requested day.
    const simplified = segments
      .map((segment) => {
        const segStart = new Date(segment.start);
        const segEnd = segment.end ? new Date(segment.end) : now;

        // compute split parts across user-days
        const parts = splitSecondsByUserDay(segStart, segEnd, timezone, resetHour);

        // the part for the requested day (if exists)
        const partForDay = parts.find((p) => p.date.getTime() === finalDate.getTime());

        if (!partForDay) return null; // nothing of this segment belongs to the requested day

        // return clipped values as the primary fields so UI reads the per-day slice
        return {
          id: segment.id,
          // clipped values for the requested day
          start: partForDay.segmentStart,
          end: partForDay.segmentEnd,
          duration: partForDay.seconds,
          // also keep original/full values for reference
          originalStart: segStart,
          originalEnd: segment.end ? new Date(segment.end) : null,
          originalDuration: segment.duration ?? Math.floor((segEnd.getTime() - segStart.getTime()) / 1000),
          type: segment.type,
          label: segment.label,
          focusArea: {
            id: segment.focusArea?.id,
            name: segment.focusArea?.name,
          },
        };
      })
      .filter(Boolean); // remove nulls (segments with no part in requested day)

    return NextResponse.json(simplified, { status: 200 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
};
