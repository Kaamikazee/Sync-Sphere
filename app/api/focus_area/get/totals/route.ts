import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const session = await getAuthSession();
  const user = session?.user;

  if (!user) return NextResponse.json("No such user found", { status: 404 });
  if (!userId) return NextResponse.json("Missing userId", { status: 400 });

  const timezone = user.timezone ?? "Asia/Kolkata";
  const resetHour = user.resetHour ?? 0;

  const { startUtc, endUtc } = getUserDayRange(
    { timezone, resetHour },
    new Date()
  );

  try {
    const focusAreaTotals = await db.timerSegment.groupBy({
      by: ["focusAreaId"],
      where: {
        userId,
        start: { gte: startUtc },
        end: { lt: endUtc },
      },
      _sum: {
        duration: true,
      },
    });

    const result = focusAreaTotals.map(item => ({
      focusAreaId: item.focusAreaId,
      totalDuration: item._sum.duration ?? 0,
    }));

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
