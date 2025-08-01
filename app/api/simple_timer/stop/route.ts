import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";
import { z } from "zod";

export const POST = async (request: Request) => {
  const session = await getAuthSession();
  const userId = session?.user.id;

  if (!userId) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  const today = normalizeToStartOfDay(new Date());
  const body: unknown = await request.json();

  const result = z
    .object({
      segmentId: z.string(),
    })
    .safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  const { segmentId } = result.data;

  const segment = await db.timerSegment.findUnique({
    where: { id: segmentId },
  });

  if (!segment || segment.end) {
    return NextResponse.json({ error: "Invalid or already-stopped segment" }, { status: 400 });
  }

  // ✅ Only FOCUS segments can trigger breaks
  if (segment.type !== "FOCUS") {
    return NextResponse.json("ERRORS.NOT_FOCUS_SEGMENT", { status: 400 });
  }

  // ✅ Calculate duration and update segment
  const now = new Date();
  const duration = Math.floor((now.getTime() - new Date(segment.start).getTime()) / 1000);

  try {
    const existing = await db.dailyTotal.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    console.log("Fetched dailyTotal:", existing);

    if (!existing) {
      return NextResponse.json("ERRORS.NOT_RUNNING", { status: 404 });
    }

    const [breakSegment] = await db.$transaction([
      // ✅ Stop current FOCUS segment
      db.timerSegment.update({
        where: { id: segmentId },
        data: {
          end: now,
          duration,
        },
      }),

      // ✅ Auto-start BREAK segment
      db.timerSegment.create({
        data: {
          userId,
          type: "BREAK",
          start: now,
          date: today,
        },
      }),

      // ✅ Update daily total
      db.dailyTotal.update({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        data: {
          isRunning: false,
          startTimestamp: null,
          totalSeconds: { increment: duration },
        },
      }),
    ]);

    return NextResponse.json(
      { status: "OK", breakSegmentId: breakSegment.id, duration },
      { status: 200 }
    );
  } catch (err) {
    console.error("Timer stop error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
