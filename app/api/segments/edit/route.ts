import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { splitSecondsByUserDay } from "@/utils/splitSecondsByUserDay";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  segment: z.object({
    end: z.coerce.date(), // accepts string/number/Date and turns into Date
    focusAreaId: z.string().uuid(), // optional .uuid() if your IDs are UUIDs
  }),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  const url = new URL(request.url);
  const segmentId = url.searchParams.get("segmentId");

  if (!session?.user) return NextResponse.json("Unauthorized", { status: 400 });

  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });

  const { end, focusAreaId } = parsed.data.segment;

  const newEnd = new Date(end);
  const userId = session.user.id;
  const timezone = session.user.timezone ?? "Asia/Kolkata";
  const resetHour = session.user.resetHour ?? 0;

  try {
    const oldSegment = await db.timerSegment.findUnique({
      where: { id: segmentId! },
    });
    if (!oldSegment || !oldSegment.end)
      return NextResponse.json("Segment not found or not stopped", {
        status: 404,
      });

    const start = new Date(oldSegment.start);
    const oldEnd = new Date(oldSegment.end);

    const oldPerDay = splitSecondsByUserDay(start, oldEnd, timezone, resetHour);
    const newPerDay = splitSecondsByUserDay(start, newEnd, timezone, resetHour);

    // build delta map: isoDate -> deltaSeconds (new - old)
    const deltas = new Map<string, number>();
    for (const p of oldPerDay) {
      const iso = p.date.toISOString();
      deltas.set(iso, (deltas.get(iso) ?? 0) - p.seconds);
    }
    for (const p of newPerDay) {
      const iso = p.date.toISOString();
      deltas.set(iso, (deltas.get(iso) ?? 0) + p.seconds);
    }

    // ensure we are only decreasing (no increases allowed)
    for (const [, delta] of deltas.entries()) {
      if (delta > 0) {
        return NextResponse.json("Cannot extend productivity segment", {
          status: 400,
        });
      }
    }

    // Build transaction: update segment + upsert all impacted dates
    // eslint-disable-next-line
    const txOps: any[] = [];

    const newDuration = Math.floor((newEnd.getTime() - start.getTime()) / 1000);
    txOps.push(
      db.timerSegment.update({
        where: { id: segmentId! },
        data: { end: newEnd, focusAreaId, duration: newDuration },
      })
    );

    for (const [iso, delta] of deltas.entries()) {
      if (delta === 0) continue;
      const date = new Date(iso);
      txOps.push(
        db.dailyTotal.upsert({
          where: { userId_date: { userId, date } },
          create: {
            userId,
            date,
            totalSeconds: Math.max(0, delta), // if creating and delta < 0, create 0
            isRunning: false,
            startTimestamp: null,
          },
          update: {
            totalSeconds: { increment: delta },
            isRunning: false,
            startTimestamp: null,
          },
        })
      );
    }

    await db.$transaction(txOps);
    return NextResponse.json(
      { status: "OK", deltas: Object.fromEntries(deltas) },
      { status: 200 }
    );
  } catch (err) {
    console.error("DB ERROR:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
}
