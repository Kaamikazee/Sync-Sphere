// app/api/timer/stop/route.ts

import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const POST = async () => {
  const session = await getAuthSession();
  const userId = session?.user.id;

  if (!userId) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  const today = normalizeToStartOfDay(new Date());

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
      return NextResponse.json("ERRORS.NOT_RUNNING", { status: 400 });
    }

    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(existing.startTimestamp).getTime()) / 1000
    );

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
        totalSeconds: existing.totalSeconds + elapsedSeconds,
      },
    });

    return NextResponse.json("OK", { status: 200 });
  } catch (err) {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
