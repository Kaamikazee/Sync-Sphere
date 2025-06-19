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
    return NextResponse.json({ error: "Invalid or already-stopped segment" });
  }

  // ✅ Calculate duration and update segment
  const now = new Date();
  const duration = Math.floor((now.getTime() - new Date(segment.start).getTime()) / 1000);

  await db.timerSegment.update({
    where: { id: segmentId },
    data: {
      end: now,
      duration,
    },
  });

  try {
    const existing = await db.dailyTotal.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (!existing || !existing.isRunning || !existing.startTimestamp) {
      return NextResponse.json("ERRORS.NOT_RUNNING", { status: 404 });
    }

    await db.dailyTotal.update({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      data: {
        isRunning: false,
        startTimestamp: null,
        totalSeconds: { increment: duration },
      },
    });

    return NextResponse.json("OK", { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
    
  }
};
