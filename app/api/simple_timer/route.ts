import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
// import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const session = await getAuthSession();
  const user = session?.user;
  console.log("user:", user);
  console.log("userId:", userId);

  if (!user) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  // Ensure timezone & resetHour exist (fallbacks if missing)
  const timezone = user.timezone ?? "Asia/Kolkata"; // default IST
  const resetHour = user.resetHour ?? 0;

  // Get user's day range in UTC
  const { startUtc } = getUserDayRange({ timezone, resetHour }, new Date());

  // `today` should match your dailyTotal.date (start of user’s day in UTC)
  const today = startUtc;

  try {
    let dailyTotal = await db.dailyTotal.findUnique({
      where: {
        userId_date: {
          userId: userId!,
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
          userId: userId!,
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
