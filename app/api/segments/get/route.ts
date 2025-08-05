import db from "@/lib/db";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);

  const userId = url.searchParams.get("userId");
  const dateParam = url.searchParams.get("date");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  

  const targetDate = dateParam
    ? normalizeToStartOfDay(new Date(dateParam))
    : normalizeToStartOfDay(new Date());

  try {
    const segments = await db.timerSegment.findMany({
      where: {
        userId,
        date: targetDate,
      },
      orderBy: {
        start: "asc",
      },
      include: {
        focusArea: true,
      },
    });

    const simplified = segments.map((segment) => ({
      id: segment.id,
      start: segment.start,
      end: segment.end,
      duration: segment.duration,
      date: segment.date,
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
