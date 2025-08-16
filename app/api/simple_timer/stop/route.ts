// app/api/simple_timer/stop/route.ts
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Split elapsed seconds between user-days.
 *
 * Returns an array of { date: Date (startUtc for that user-day), seconds: number }
 * The `date` returned matches the shape you use for dailyTotal.date (startUtc).
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
    // startUtc is the UTC Date representing the start of the user's day containing cursor
    // compute next day startUtc:
    const nextDayStartUtc = new Date(dayStartUtc.getTime() + 24 * 3600 * 1000);

    // the portion of this session that belongs to the current user-day ends at either end or nextDayStartUtc
    const segmentEnd = new Date(Math.min(end.getTime(), nextDayStartUtc.getTime()));

    const secs = Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000);
    const keyDate = new Date(dayStartUtc); // ensure a fresh Date object

    // if secs is 0 (edge cases), still add maybe? We skip zero increments to avoid no-op upserts
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

export const POST = async (request: Request) => {
  const session = await getAuthSession();
  const user = session?.user;
  const userId = user?.id;

  if (!user) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  // Ensure timezone & resetHour exist (fallbacks if missing)
  const timezone = user.timezone ?? "Asia/Kolkata"; // default IST
  const resetHour = user.resetHour ?? 0;

  // Get user's day range in UTC for the stop time (not used for splitting here)
  // const { startUtc } = getUserDayRange({ timezone, resetHour }, new Date());
  // const today = startUtc;

  const body: unknown = await request.json();

  const result = z
    .object({
      segmentId: z.string(),
    })
    .safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  const { segmentId } = result.data;

  const segment = await db.timerSegment.findUnique({
    where: { id: segmentId },
  });

  if (!segment || segment.end) {
    return NextResponse.json(
      { error: "Invalid or already-stopped segment" },
      { status: 400 }
    );
  }

  // ✅ Only FOCUS segments can trigger breaks
  if (segment.type !== "FOCUS") {
    return NextResponse.json("ERRORS.NOT_FOCUS_SEGMENT", { status: 400 });
  }

  // Calculate duration (total seconds for the whole segment)
  const now = new Date();
  const duration = Math.floor(
    (now.getTime() - new Date(segment.start).getTime()) / 1000
  );

  try {
    // Confirm that the timer was actually running (we still require a dailyTotal record for the start day)
    // Note: we will split across days, but at minimum the day that originally started should exist (or we can upsert)
    // Here we will allow upserts so we don't fail if dailyTotal for some day is missing.

    // Split seconds by user-day boundaries
    const perDay = splitSecondsByUserDay(
      new Date(segment.start),
      now,
      timezone,
      resetHour
    );

    // Build transaction ops:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txOps: any[] = [];

    // 1) Stop current FOCUS segment (set end + duration)
    txOps.push(
      db.timerSegment.update({
        where: { id: segmentId },
        data: {
          end: now,
          duration,
        },
      })
    );

    // 2) Auto-start BREAK segment
    txOps.push(
      db.timerSegment.create({
        data: {
          userId: userId!,
          type: "BREAK",
          start: now,
        },
      })
    );

    // 3) For each affected day, upsert dailyTotal with the incremented seconds.
    //    Also clear isRunning/startTimestamp for those days (safe to clear for any affected day).
    for (const { date, seconds } of perDay) {
      txOps.push(
        db.dailyTotal.upsert({
          where: {
            userId_date: {
              userId: userId!,
              date,
            },
          },
          create: {
            userId: userId!,
            date,
            totalSeconds: seconds,
            isRunning: false,
            startTimestamp: null,
          },
          update: {
            totalSeconds: { increment: seconds },
            isRunning: false,
            startTimestamp: null,
          },
        })
      );
    }

    // Execute transaction. results array has same order as txOps array.
    const txResults = await db.$transaction(txOps);

    // txResults[0] => updated focus segment
    // txResults[1] => created break segment
    const createdBreak = txResults[1];

    return NextResponse.json(
      { status: "OK", breakSegmentId: createdBreak.id, duration, perDay },
      { status: 200 }
    );
  } catch (err) {
    console.error("Timer stop error (split):", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
