import db from "@/lib/db";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const date = url.searchParams.get("date");

  if (!userId) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  const today = normalizeToStartOfDay(new Date());

  if (date && isNaN(new Date(date).getTime())) {
    return NextResponse.json("ERRORS.INVALID_DATE", { status: 400 });
  }

  const finalDate = date ? normalizeToStartOfDay(new Date(date)) : today;

  try {
    let dailyTotal = await db.dailyTotal.findUnique({
      where: {
        userId_date: {
          userId,
          date: finalDate,
        },
      },
      select: {
        totalSeconds: true,
        isRunning: true,
        startTimestamp: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const isToday = finalDate.getTime() === today.getTime();

    if (!dailyTotal && isToday) {
      dailyTotal = await db.dailyTotal.create({
        data: {
          userId,
          date: finalDate,
          totalSeconds: 0,
          isRunning: false,
          startTimestamp: null,
        },
        select: {
          totalSeconds: true,
          isRunning: true,
          startTimestamp: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });
    }

    if (!dailyTotal) {
      return NextResponse.json(0, { status: 200 });
    }

    return NextResponse.json(dailyTotal.totalSeconds, { status: 200 });
  } catch (err) {
    console.error("GET dailyTotal error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
