// app/api/segments/get/route.ts  (drop-in replacement)
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);

  const userId = url.searchParams.get("userId");
  const dateParam = url.searchParams.get("date");
  const session = await getAuthSession();
  const user = session?.user;

  if (!user) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  // Ensure timezone & resetHour exist
  const timezone = user.timezone ?? "Asia/Kolkata";
  const resetHour = user.resetHour ?? 0;

  // Pick the base date (user-specified or today)
  const baseDate = dateParam ? new Date(dateParam) : new Date();

  // Get that day's start & end in UTC according to user's timezone/resetHour
  const { startUtc, endUtc } = getUserDayRange(
    { timezone, resetHour },
    baseDate
  );

  try {
    // ---- ATTRIBUTION-BY-START: fetch only segments that START in the requested user-day ----
    const segments = await db.timerSegment.findMany({
      where: {
        userId: userId!,
        start: { gte: startUtc, lt: endUtc }, // <-- only segments that started inside the day
      },
      orderBy: { start: "asc" },
      include: {
        focusArea: true,
      },
    });

    const simplified = segments.map((segment) => ({
      id: segment.id,
      start: segment.start,
      end: segment.end,
      duration: segment.duration,
      type: segment.type,
      label: segment.label,
      focusArea: {
        id: segment.focusArea?.id,
        name: segment.focusArea?.name,
      },
    }));

    return NextResponse.json(simplified, { status: 200 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
};
