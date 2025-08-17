import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  segment: z.object({
    end: z.coerce.date(), // accepts string/number/Date and turns into Date
    label: z.string(),
  }),
});

/**
 * Find overlapping segments with a proposed [newStart, newEnd) range.
 * Returns overlap info (empty array when no overlaps).
 */
async function findOverlappingSegments({
  userId,
  newStart,
  newEnd,
  ignoreSegmentId,
}: {
  userId: string;
  newStart: Date;
  newEnd: Date;
  ignoreSegmentId?: string | null;
}) {
  if (newEnd <= newStart) return [];

  // candidate segments that might overlap the proposed range:
  // seg.start < newEnd AND (seg.end IS NULL OR seg.end > newStart)
  const candidates = await db.timerSegment.findMany({
    where: {
      userId,
      AND: [
        { start: { lt: newEnd } },
        {
          OR: [{ end: null }, { end: { gt: newStart } }],
        },
      ],
      NOT: ignoreSegmentId ? { id: ignoreSegmentId } : undefined,
    },
    select: {
      id: true,
      start: true,
      end: true,
      type: true,
      label: true,
      focusArea: { select: { name: true } },
    },
    orderBy: { start: "asc" },
  });

  const now = new Date();
  //   eslint-disable-next-line
  const overlaps: Array<any> = [];

  for (const seg of candidates) {
    const otherStart = new Date(seg.start);
    const otherEndForCalc = seg.end ? new Date(seg.end) : now;

    // compute overlap window
    const overlapStart = otherStart > newStart ? otherStart : newStart;
    const overlapEnd = otherEndForCalc < newEnd ? otherEndForCalc : newEnd;

    const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
    const overlapSeconds = overlapMs > 0 ? Math.floor(overlapMs / 1000) : 0;

    if (overlapSeconds > 0) {
      overlaps.push({
        id: seg.id,
        type: seg.type,
        label: seg.label,
        focusAreaName: seg.focusArea?.name ?? null,
        existingStart: otherStart,
        existingEnd: seg.end ? new Date(seg.end) : null,
        overlapStart,
        overlapEnd,
        overlapSeconds,
      });
    }
  }

  return overlaps;
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  const url = new URL(request.url);
  const segmentId = url.searchParams.get("segmentId");

  if (!session?.user) return NextResponse.json("Unauthorized", { status: 400 });

  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });

  const { end: newEndRaw, label } = parsed.data.segment;
  const userId = session.user.id;

  try {
    const oldSegment = await db.timerSegment.findUnique({
      where: { id: segmentId! },
    });

    if (!oldSegment || !oldSegment.end) {
      return NextResponse.json("Segment not found or not stopped", { status: 404 });
    }

    // If you want to ensure this is a BREAK segment:
    if (oldSegment.type !== "BREAK") {
      return NextResponse.json("This route only edits break segments", { status: 400 });
    }

    const start = new Date(oldSegment.start);
    const oldEnd = new Date(oldSegment.end);
    const newEnd = new Date(newEndRaw);

    // basic validation
    if (newEnd.getTime() <= start.getTime()) {
      return NextResponse.json("Invalid end time", { status: 400 });
    }

    // forbid extending
    if (newEnd.getTime() > oldEnd.getTime()) {
      return NextResponse.json("Cannot extend segment", { status: 400 });
    }

    // If only label changed (no duration change), update and return early
    const oldDuration = Math.floor((oldEnd.getTime() - start.getTime()) / 1000);
    const newDuration = Math.floor((newEnd.getTime() - start.getTime()) / 1000);
    if (newDuration === oldDuration) {
      await db.timerSegment.update({
        where: { id: segmentId! },
        data: { label },
      });
      return NextResponse.json({ status: "OK" }, { status: 200 });
    }

    // check overlaps with other segments (exclude the segment being edited)
    const overlaps = await findOverlappingSegments({
      userId,
      newStart: start,
      newEnd,
      ignoreSegmentId: segmentId!,
    });

    if (overlaps.length > 0) {
      // Respond with conflict details so frontend can show which segments conflict
      return NextResponse.json({ error: "OVERLAP", overlaps }, { status: 409 });
    }

    // safe to update — we are NOT touching dailyTotal (per your request)
    await db.timerSegment.update({
      where: { id: segmentId! },
      data: {
        end: newEnd,
        label,
        duration: newDuration,
      },
    });

    return NextResponse.json({ status: "OK" }, { status: 200 });
  } catch (err) {
    console.error("DB ERROR:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
}
