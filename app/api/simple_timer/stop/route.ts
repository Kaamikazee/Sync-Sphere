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

  if (!userId) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  console.log("🔥 STOP ROUTE HIT", {
    at: new Date().toISOString(),
    userId,
  });

  const timezone = user.timezone ?? "Asia/Kolkata";
  const resetHour = user.resetHour ?? 0;

  // body is optional now
  let body: unknown = {};
  try {
    body = await request.json();
  } catch (err) {
    console.log(err);
  }

  const result = z
    .object({
      segmentId: z.string().optional(),
    })
    .safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  const providedSegmentId = result.data.segmentId;

  // authoritative running row
  const running = await db.runningTimer.findUnique({
    where: { userId },
  });

  let segment = null;

  if (running?.segmentId) {
    segment = await db.timerSegment.findUnique({
      where: { id: running.segmentId },
      include: {
        focusArea: { select: { name: true } },
      },
    });
  } else if (providedSegmentId) {
    segment = await db.timerSegment.findUnique({
      where: { id: providedSegmentId },
      include: {
        focusArea: { select: { name: true } },
      },
    });
  } else {
    segment = await db.timerSegment.findFirst({
      where: { userId, end: null, type: "FOCUS" },
      orderBy: { start: "desc" },
      include: {
        focusArea: { select: { name: true } },
      },
    });
  }

  if (!segment || segment.end) {
    return NextResponse.json(
      { error: "Invalid or already-stopped segment" },
      { status: 400 }
    );
  }

  if (segment.type !== "FOCUS") {
    return NextResponse.json("ERRORS.NOT_FOCUS_SEGMENT", { status: 400 });
  }

  const startTimestamp = running?.startTimestamp ?? segment.start;
  const now = new Date();
  const duration = Math.floor(
    (now.getTime() - new Date(startTimestamp).getTime()) / 1000
  );

  try {
    const perDay = splitSecondsByUserDay(
      new Date(startTimestamp),
      now,
      timezone,
      resetHour
    );

    // eslint-disable-next-line
    const txOps: any[] = [];

    // finalize focus
    txOps.push(
      db.timerSegment.update({
        where: { id: segment.id },
        data: {
          end: now,
          duration,
        },
      })
    );

    // auto break
    txOps.push(
      db.timerSegment.create({
        data: {
          userId,
          type: "BREAK",
          start: now,
        },
      })
    );

    // daily totals
    for (const { date, seconds } of perDay) {
      txOps.push(
        db.dailyTotal.upsert({
          where: {
            userId_date: { userId, date },
          },
          create: {
            userId,
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

    // safe delete
    txOps.push(
      db.runningTimer.deleteMany({
        where: { userId },
      })
    );

    await db.$transaction(txOps);

    return NextResponse.json(
      {
        status: "OK",
        duration,
        perDay,
        stoppedSegment: {
          id: segment.id,
          focusAreaId: segment.focusAreaId,
          focusAreaName: segment.focusArea?.name ?? null,
          start: segment.start,
          end: now,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Timer stop error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
