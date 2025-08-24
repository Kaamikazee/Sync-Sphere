// app/api/timer/start/route.ts
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
import { NextResponse } from "next/server";
import { z } from "zod";

export const POST = async (request: Request) => {
  const session = await getAuthSession();
  const user = session?.user;
  const userId = user?.id;

  if (!user) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  // Ensure timezone & resetHour exist (fallbacks if missing)
  const timezone = user.timezone ?? "Asia/Kolkata";
  const resetHour = user.resetHour ?? 0;

  // Get user's day range in UTC
  const { startUtc } = getUserDayRange({ timezone, resetHour }, new Date());
  const today = startUtc;
  const now = new Date();

  const body: unknown = await request.json();
  const result = z
    .object({
      focusAreaId: z.string(),
      breakReason: z.string().optional(),
    })
    .safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  const { focusAreaId, breakReason } = result.data;
  const cleanLabel = breakReason?.trim() || null;

  let lastBreakStart: Date | null = null;
  let lastBreakEnd: Date | null = null;

  // Close any ongoing BREAK segment (same behavior as before)
  const lastSegment = await db.timerSegment.findFirst({
    where: { userId, end: null, type: "BREAK" },
    orderBy: { start: "desc" },
  });

  if (lastSegment) {
    const duration = Math.floor((now.getTime() - lastSegment.start.getTime()) / 1000);

    // If break lasted 5 hours or more, mark NOT_RECORDED
    if (duration >= 5 * 3600) {
      await db.timerSegment.update({
        where: { id: lastSegment.id },
        data: { end: now, duration, label: "NOT_RECORDED" },
      });
      // don't expose lastBreakStart/lastBreakEnd
    } else {
      // otherwise update the break segment and expose its start/end
      await db.timerSegment.update({
        where: { id: lastSegment.id },
        data: {
          end: now,
          duration,
          label: cleanLabel,
        },
      });

      lastBreakStart = lastSegment.start;
      lastBreakEnd = now;
    }
  }

  // Defensive: Close any existing FOCUS segment (if any)
  const existingFocus = await db.timerSegment.findFirst({
    where: { userId, end: null, type: "FOCUS" },
    orderBy: { start: "desc" },
  });

  if (existingFocus) {
    const focusDuration = Math.floor((now.getTime() - existingFocus.start.getTime()) / 1000);
    await db.timerSegment.update({
      where: { id: existingFocus.id },
      data: {
        end: now,
        duration: focusDuration,
      },
    });
  }

  // Create new FOCUS segment
  const segment = await db.timerSegment.create({
    data: {
      userId: userId!,
      focusAreaId,
      start: now,
      type: "FOCUS",
    },
  });

  try {
    // Upsert the RunningTimer (authoritative single running row per user)
    // and upsert today's dailyTotal to mark it running (keeps backward compatibility)
    await db.$transaction([
      db.runningTimer.upsert({
        where: { userId },
        create: {
          userId: userId!,
          startTimestamp: now,
          segmentId: segment.id,
        },
        update: {
          startTimestamp: now,
          segmentId: segment.id,
        },
      }),
      db.dailyTotal.upsert({
        where: { userId_date: { userId: userId!, date: today } },
        create: {
          userId: userId!,
          date: today,
          totalSeconds: 0,
          isRunning: true,
          startTimestamp: now,
        },
        update: {
          isRunning: true,
          startTimestamp: now,
        },
      }),
    ]);

    return NextResponse.json(
      {
        segmentId: segment.id,
        start: segment.start,
        ...(lastBreakStart && { lastBreakStart }),
        ...(lastBreakEnd && { lastBreakEnd }),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Start timer error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
