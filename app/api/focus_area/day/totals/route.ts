// app/api/focus_area/day/totals/route.ts
import db from "@/lib/db";
import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const date = url.searchParams.get("date");

  if (!userId) return NextResponse.json("No such user found", { status: 404 });

  const today = normalizeToStartOfDayIST(new Date());
  const finalDate = date ? normalizeToStartOfDayIST(new Date(date)) : today;
  

  try {
    // For future dates, return early with empty response
    if (finalDate > today) {
      return NextResponse.json([], { status: 200 });
    }

    const focusAreaTotals = await db.timerSegment.groupBy({
      by: ["focusAreaId"],
      where: {
        userId,
        date: finalDate,
      },
      _sum: {
        duration: true,
      },
    });


    const result = focusAreaTotals.map((item) => ({
      focusAreaId: item.focusAreaId,
      totalDuration: item._sum.duration ?? null,
    }));
    

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Focus area fetch error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
