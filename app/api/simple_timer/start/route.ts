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
  const timezone = user.timezone ?? "Asia/Kolkata"; // default IST
  const resetHour = user.resetHour ?? 0;

  // Get user's day range in UTC
  const { startUtc } = getUserDayRange(
    { timezone, resetHour },
    new Date()
  );

  // `today` should match your dailyTotal.date (start of user’s day in UTC)
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

  // Close any ongoing break segment
  const lastSegment = await db.timerSegment.findFirst({
    where: { userId, end: null, type: "BREAK" },
    orderBy: { start: "desc" },
  });

  if (lastSegment) {
    const duration = Math.floor((now.getTime() - lastSegment.start.getTime()) / 1000);

    // If break lasted 5 hours or more, discard it (delete the DB record)
    if (duration >= 5 * 3600) {
      await db.timerSegment.delete({ where: { id: lastSegment.id } });
      // we do NOT expose lastBreakStart/lastBreakEnd in the response
    } else {
      // otherwise update the break segment as before; label it "Other" if >= 3h
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

  // Create new focus segment
  const segment = await db.timerSegment.create({
    data: {
      userId: userId!,
      focusAreaId,
      start: now,
      type: "FOCUS",
    },
  });

  try {
    await db.dailyTotal.upsert({
      where: { userId_date: { userId: userId!, date: today } },
      update: { isRunning: true, startTimestamp: now },
      create: {
        userId: userId!,
        date: today,
        totalSeconds: 0,
        isRunning: true,
        startTimestamp: now,
      },
    });

    return NextResponse.json(
      {
        segmentId: segment.id,
        start: segment.start,
        ...(lastBreakStart && { lastBreakStart }),
        ...(lastBreakEnd && { lastBreakEnd }),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
