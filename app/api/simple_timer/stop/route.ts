// app/api/simple_timer/stop/route.ts
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { splitSecondsByUserDay } from "@/utils/splitSecondsByUserDay";
import { NextResponse } from "next/server";
import { z } from "zod";

export const POST = async (request: Request) => {
  const session = await getAuthSession();
  const user = session?.user;
  const userId = user?.id;

  if (!user) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  const timezone = user.timezone ?? "Asia/Kolkata";
  const resetHour = user.resetHour ?? 0;

  const body: unknown = await request.json();
  const result = z
    .object({
      segmentId: z.string().optional(),
    })
    .safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  const providedSegmentId = result.data.segmentId;

  // Prefer authoritative RunningTimer row
  const running = await db.runningTimer.findUnique({ where: { userId } });

  // Resolve segment to finalize
  let segment = null;

  if (running && running.segmentId) {
    segment = await db.timerSegment.findUnique({ where: { id: running.segmentId } });
  } else if (providedSegmentId) {
    segment = await db.timerSegment.findUnique({ where: { id: providedSegmentId } });
  } else {
    // fallback: find the most recent open focus segment
    segment = await db.timerSegment.findFirst({
      where: { userId, end: null, type: "FOCUS" },
      orderBy: { start: "desc" },
    });
  }

  if (!segment || segment.end) {
    return NextResponse.json(
      { error: "Invalid or already-stopped segment" },
      { status: 400 }
    );
  }

  // IMPORTANT: enforce that only FOCUS segments can be stopped here
  if (segment.type !== "FOCUS") {
    return NextResponse.json("ERRORS.NOT_FOCUS_SEGMENT", { status: 400 });
  }

  // Determine actual start time: prefer running.startTimestamp (authoritative), else segment.start
  const startTimestamp = running?.startTimestamp ?? segment.start;
  const now = new Date();
  const duration = Math.floor((now.getTime() - new Date(startTimestamp).getTime()) / 1000);

  try {
    // Split seconds by user-day boundaries
    const perDay = splitSecondsByUserDay(new Date(startTimestamp), now, timezone, resetHour);

    // Build transaction ops
    // 1) finalize focus segment
    // 2) create auto-start BREAK segment
    // 3) upsert per-day dailyTotal increments
    // 4) delete runningTimer row if present
    // eslint-disable-next-line
    const txOps: any[] = [];

    txOps.push(
      db.timerSegment.update({
        where: { id: segment.id },
        data: {
          end: now,
          duration,
        },
      })
    );

    txOps.push(
      db.timerSegment.create({
        data: {
          userId: userId!,
          type: "BREAK",
          start: now,
        },
      })
    );

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

    if (running) {
      txOps.push(db.runningTimer.delete({ where: { userId } }));
    }

    const txResults = await db.$transaction(txOps);
    const createdBreak = txResults[1];

    return NextResponse.json(
      { status: "OK", breakSegmentId: createdBreak.id, duration, perDay },
      { status: 200 }
    );
  } catch (err) {
    console.error("Timer stop error (runningTimer):", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
