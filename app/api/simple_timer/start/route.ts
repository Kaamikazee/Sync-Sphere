// app/api/timer/start/route.ts

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

    return NextResponse.json("OK", { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
