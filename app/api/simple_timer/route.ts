import db from "@/lib/db";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  const today = normalizeToStartOfDay(new Date());
//   today.setHours(0, 0, 0, 0); // normalize to midnight

  try {
    let dailyTotal = await db.dailyTotal.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
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

    // If no record exists, create one 
    if (!dailyTotal) {
      dailyTotal = await db.dailyTotal.create({
        data: {
          userId,
          date: today,
          totalSeconds: 0,
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

    return NextResponse.json(dailyTotal, { status: 200 });

  } catch (err) {
    console.error("GET dailyTotal error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
