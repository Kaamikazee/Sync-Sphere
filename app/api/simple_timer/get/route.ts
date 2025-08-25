import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const groupId = url.searchParams.get("groupId");
  const session = await getAuthSession();
  const user = session?.user;

  if (!user) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  if (!groupId) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  // Ensure timezone & resetHour exist (fallbacks if missing)
  const timezone = user.timezone ?? "Asia/Kolkata"; // default IST
  const resetHour = user.resetHour ?? 0;

  // Get user's day range in UTC for *today*
  const { startUtc } = getUserDayRange({ timezone, resetHour }, new Date());
  const today = startUtc;
  const endUtc = new Date(startUtc.getTime() + 24 * 3600 * 1000);

  try {
    // 1) Fetch subscriptions + user metadata (warnings + dailyTotal if present)
    const subs = await db.subscription.findMany({
      where: { groupId },
      include: {
        user: {
          include: {
            receivedWarnings: true,
            issuedWarnings: true,
            dailyTotal: {
              where: { date: today },
              take: 1,
            },
          },
        },
      },
    });

    if (!subs || subs.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // 2) Collect userIds and fetch all timer segments for these users that overlap the requested UTC window.
    const userIds = subs.map((s) => s.userId);

    const segments = await db.timerSegment.findMany({
      where: {
        userId: { in: userIds },
        type: "FOCUS",
        AND: [
          { start: { lt: endUtc } },
          {
            OR: [{ end: null }, { end: { gt: startUtc } }],
          },
        ],
      },
      select: {
        userId: true,
        start: true,
        end: true,
      },
    });

    // group segments by userId for fast lookup
    const segmentsByUser = new Map<string, { start: Date; end: Date | null }[]>();
    for (const seg of segments) {
      const arr = segmentsByUser.get(seg.userId) ?? [];
      arr.push({ start: new Date(seg.start), end: seg.end ? new Date(seg.end) : null });
      segmentsByUser.set(seg.userId, arr);
    }

    // helper to clamp a segment to [startUtc, endUtc) and return seconds (uses now for running segs)
    const clampAndSeconds = (segStart: Date, segEnd: Date | null) => {
      const effectiveStart = segStart < startUtc ? startUtc : segStart;
      const now = new Date();
      const segEndUsed = segEnd ? segEnd : now; // running segment -> clamp to now
      const effectiveEnd = segEndUsed > endUtc ? endUtc : segEndUsed;
      if (effectiveEnd.getTime() <= effectiveStart.getTime()) return 0;
      return Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 1000);
    };

    // 3) Build the response using computed totals from segments (clamped to today window).
    const membersWithTimer = subs.map((s) => {
      const warnings = s.user.receivedWarnings?.filter((w) => w.groupId === groupId) ?? [];

      const userSegs = segmentsByUser.get(s.userId) ?? [];

      // compute totalSeconds for today's window from segments
      let computedSeconds = 0;
      let isRunningFromSeg = false;
      let runningStartTimestamp: Date | null = null;

      for (const seg of userSegs) {
        // if seg.end is null -> running segment
        if (!seg.end) {
          // mark running and pick the earliest running start (or latest, depending on your semantics)
          isRunningFromSeg = true;
          // choose the seg.start as the startTimestamp (you may prefer the latest running seg if multiple)
          runningStartTimestamp = seg.start;
        }
        computedSeconds += clampAndSeconds(seg.start, seg.end);
      }

      // If dailyTotal exists, we still prefer computedSeconds (it's authoritative since it's derived from segments).
      // But we can fall back to stored dailyTotal only if there were no segments found (rare).
      const stored = s.user.dailyTotal?.[0];

      const totalSeconds = computedSeconds ?? stored?.totalSeconds ?? 0;
      const isRunning = isRunningFromSeg ?? stored?.isRunning ?? false;
      const startTimestamp = runningStartTimestamp ?? stored?.startTimestamp ?? null;

      return {
        user: {
          id: s.userId,
          name: s.user.name,
          image: s.user.image,
          totalSeconds,
          isRunning,
          startTimestamp,
          warningMessage: warnings.length > 0 ? warnings[0].message : null,
          warningId: warnings.length > 0 ? warnings[0].id : null,
          Role: s.userRole,
        },
      };
    });

    return NextResponse.json(membersWithTimer, { status: 200 });
  } catch (err) {
    console.error("GET dailyTotal error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
