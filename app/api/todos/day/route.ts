import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
// import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
//   const activityId = session?.user.id
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const date = url.searchParams.get("date");
    const session = await getAuthSession();
    const user = session?.user;
  
    if (!user) {
      return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
    }

    const timezone = user.timezone ?? "Asia/Kolkata";
      const resetHour = user.resetHour ?? 0;
    
      // Pick the base date (user-specified or today)
      const baseDate = date ? new Date(date) : new Date();
    
      // Get that day's start & end in UTC according to user's timezone/resetHour
      const { startUtc } = getUserDayRange(
        { timezone, resetHour },
        baseDate
      );
    
      const finalDate = date
        ? getUserDayRange({ timezone, resetHour }, new Date(date)).startUtc
        : startUtc;

  try {
    const todos = await db.todo.findMany({
      where: {
        userId: userId!,
        date: finalDate, // Filter by the normalized date
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!todos) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(todos, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};