// app/api/timer/start/route.ts

import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";
import { z } from "zod";

export const POST = async (request: Request) => {
  const session = await getAuthSession();
  const userId = session?.user.id;

  if (!userId) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  const today = normalizeToStartOfDay(new Date());

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
    const now = new Date();
    await db.timerSegment.update({
      where: { id: lastSegment.id },
      data: {
        end: now,
        duration: Math.floor((now.getTime() - lastSegment.start.getTime()) / 1000),
        label: cleanLabel,
      },
    });
  }

//   ---------CREATING TIME SEGMENT ON START---------

  const segment = await db.timerSegment.create({
    data: {
        userId,
        focusAreaId, //get the activityId from there and send it
        start: new Date(),
        date: today,
        type: "FOCUS"
    }
  })

//   --------------------------------

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
        startTimestamp: new Date(),
      },
      create: {
        userId,
        date: today,
        totalSeconds: 0,
        isRunning: true,
        startTimestamp: new Date(),
      },
    });

    return NextResponse.json({ segmentId: segment.id, start: segment.start }, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
