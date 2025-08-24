import { getAuthSession } from "@/lib/auth";
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

  // cursor walks from start to end
  let cursor = new Date(start);

  while (cursor < end) {
    const { startUtc: dayStartUtc } = getUserDayRange({ timezone, resetHour }, cursor);
    // compute next day startUtc:
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
  const groupId = url.searchParams.get("groupId");
  const session = await getAuthSession();
  const user = session?.user;

  if (!user) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  if (!groupId) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  // Ensure timezone & resetHour exist (fallbacks if missing)
  const timezone = user.timezone ?? "Asia/Kolkata"; // default IST
  const resetHour = user.resetHour ?? 0;

  // Get user's day range in UTC for today
  const { startUtc: todayStartUtc, endUtc: todayEndUtc } = getUserDayRange({ timezone, resetHour }, new Date());
  const today = todayStartUtc;

  try {
    // Fetch subscriptions + user (and only the timerSegments that matter around today)
    const membersWithSegments = await db.subscription.findMany({
      where: { groupId },
      include: {
        user: {
          include: {
            receivedWarnings: true,
            issuedWarnings: true,
            timerSegments: {
              where: {
                AND: [
                  { start: { lt: todayEndUtc } },
                  {
                    OR: [
                      { end: null },
                      { end: { gt: todayStartUtc } }
                    ]
                  }
                ]
              },
              orderBy: { start: "asc" },
              select: {
                id: true,
                start: true,
                end: true,
                type: true,
                label: true,
              },
            },
          },
        },
      },
    });

    const now = new Date();

    const membersWithTimer = membersWithSegments.map((subs) => {
      const warnings = subs.user.receivedWarnings?.filter(
        (w) => w.groupId === groupId
      ) ?? [];

      // compute today's seconds by splitting each segment and summing parts that belong to 'today'
      let totalSeconds = 0;
      for (const seg of subs.user.timerSegments) {
        const segStart = new Date(seg.start);
        const segEnd = seg.end ? new Date(seg.end) : now; // running segments count up to now
        if (segEnd <= segStart) continue;
        const parts = splitSecondsByUserDay(segStart, segEnd, timezone, resetHour);
        const todayPart = parts.find(p => p.date.getTime() === today.getTime());
        if (todayPart) totalSeconds += todayPart.seconds;
      }

      // isRunning: true if any running segment exists (end === null)
      const runningSeg = subs.user.timerSegments.find(s => s.end == null);
      const isRunning = !!runningSeg;
      const startTimestamp = runningSeg ? new Date(runningSeg.start) : null;

      return {
        user: {
          id: subs.userId,
          name: subs.user.name,
          image: subs.user.image,
          totalSeconds,
          isRunning,
          startTimestamp,
          warningMessage: warnings.length > 0 ? warnings[0].message : null, // latest warning if any
          warningId: warnings.length > 0 ? warnings[0].id : null,
          Role: subs.userRole,
        },
      };
    });

    return NextResponse.json(membersWithTimer, { status: 200 });
  } catch (err) {
    console.error("GET dailyTotal error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
