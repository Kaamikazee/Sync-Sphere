// app/api/timer/start/route.ts

import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";
import { z } from "zod";

export const POST = async (request: Request) => {
  const session = await getAuthSession();
  const userId = session?.user.id;

  if (!userId) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  const today = normalizeToStartOfDayIST(new Date());
  const now = new Date(); // ✅ always defined

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

  // 🧠 1. Close any ongoing break segment if exists
  const lastSegment = await db.timerSegment.findFirst({
    where: {
      userId,
      end: null,
      type: "BREAK",
    },
    orderBy: { start: "desc" },
  });

  if (lastSegment) {
    const duration = Math.floor((now.getTime() - lastSegment.start.getTime()) / 1000);
    await db.timerSegment.update({
      where: { id: lastSegment.id },
      data: {
        end: now,
        duration,
        label: duration >= 3 * 3600 ? "Other" : cleanLabel,
      },
    });

    lastBreakStart = lastSegment.start;
    lastBreakEnd = now;
  }

  // ---------CREATING TIME SEGMENT ON START---------
  const segment = await db.timerSegment.create({
    data: {
      userId,
      focusAreaId,
      start: now,
      date: today,
      type: "FOCUS",
    },
  });

  try {
    await db.dailyTotal.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        isRunning: true,
        startTimestamp: now,
      },
      create: {
        userId,
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

