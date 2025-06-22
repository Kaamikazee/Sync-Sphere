import db from "@/lib/db";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) return NextResponse.json("No such user found", { status: 404 });

  const today = normalizeToStartOfDay(new Date());

  try {
    const focusAreaTotals = await db.timerSegment.groupBy({
      by: ["focusAreaId"],
      where: {
        userId: userId,
        date: today,
      },
      _sum: {
        duration: true,
      },
    });

    const result = focusAreaTotals.map(item => ({
      focusAreaId: item.focusAreaId,
      totalDuration: item._sum.duration ?? 0,
    }));

    

    if (!focusAreaTotals || !result) return NextResponse.json(0, { status: 200 });

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
