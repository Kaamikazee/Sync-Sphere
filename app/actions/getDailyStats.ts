"use server";

import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimeLocal(date: Date | string, timezone: string) {
  return new Date(date).toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Fixed getDailyStats: fetch overlapping segments, clip to day window, aggregate by clipped duration.
 *
 * date: "YYYY-MM-DD"
 */
export async function getDailyStats(userId: string, date: string) {
  // validate date string (YYYY-MM-DD)
  const [yStr, mStr, dStr] = date.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) {
    throw new Error("Invalid date format, expected YYYY-MM-DD");
  }

  const session = await checkIfUserCompleteOnboarding("/dashboard");
  const user = session.user;

  const timezone = user.timezone ?? "Asia/Kolkata";
  const resetHour = user.resetHour ?? 0;

  const baseDate = date ? new Date(date) : new Date();
  const { startUtc: startUTC, endUtc: endUTC } = getUserDayRange(
    { timezone, resetHour },
    baseDate
  );

  // fetch segments that overlap the day window:
  // condition: segment.start < dayEnd  AND  (segment.end >= dayStart OR segment.end IS NULL)
  const segments = await db.timerSegment.findMany({
    where: {
      userId,
      AND: [
        { start: { lt: endUTC } },
        {
          OR: [{ end: { gte: startUTC } }, { end: null }],
        },
      ],
    },
    select: {
      id: true,
      duration: true,
      start: true,
      end: true,
      type: true,
      label: true,
      focusArea: { select: { name: true } },
    },
    orderBy: { start: "asc" },
  });

  if (!segments.length) {
    return { summary: [], focusAreaData: [], activityTypeData: [], segments: [] };
  }

  const now = new Date();

  // Helper: clip a segment to the day window and return clipped start/end and seconds
  const clippedSegments = segments.map((s) => {
    const segStart = new Date(s.start);
    const segEnd = s.end ? new Date(s.end) : now;

    const clippedStart = segStart < startUTC ? startUTC : segStart;
    const clippedEnd = segEnd > endUTC ? endUTC : segEnd;

    const clippedSeconds = Math.max(0, Math.floor((clippedEnd.getTime() - clippedStart.getTime()) / 1000));

    return {
      id: s.id,
      originalStart: segStart,
      originalEnd: s.end ? new Date(s.end) : null,
      clippedStart,
      clippedEnd,
      clippedSeconds,
      type: s.type,
      label: s.label,
      focusAreaName: s.focusArea?.name ?? null,
      isRunning: s.end == null,
    };
  }).filter(s => s.clippedSeconds > 0 || s.isRunning); // keep running segments even if clippedSeconds == 0

  // Total productive seconds (exclude breaks and segments without a focusArea name)
  const totalDuration = clippedSegments
    .filter((seg) => seg.type !== "BREAK" && seg.focusAreaName)
    .reduce((sum, seg) => sum + (seg.clippedSeconds || 0), 0);

  // Max focus (based on clipped productive segments)
  const productiveClipped = clippedSegments.filter(s => s.type !== "BREAK" && s.focusAreaName);
  const productiveDurations = productiveClipped.map(s => s.clippedSeconds || 0);
  const maxFocus = productiveDurations.length ? Math.max(...productiveDurations) : 0;

  // Started / Finished logic:
  let started: string;
  let finished: string;

  if (productiveClipped.length > 0) {
    // earliest clipped start
    const earliest = productiveClipped.reduce((min, s) => (s.clippedStart < min.clippedStart ? s : min), productiveClipped[0]);
    started = formatTimeLocal(earliest.clippedStart, timezone);

    // latest segment by actual timestamp (end if present else start)
    const latest = productiveClipped.reduce((latestSoFar, s) => {
      const latestTime = latestSoFar.originalEnd ? latestSoFar.originalEnd.getTime() : latestSoFar.originalStart.getTime();
      const sTime = s.originalEnd ? s.originalEnd.getTime() : s.originalStart.getTime();
      return sTime > latestTime ? s : latestSoFar;
    }, productiveClipped[0]);

    if (latest.originalEnd) {
      // show actual end time even if it's after the day window
      finished = formatTimeLocal(latest.originalEnd, timezone);
    } else {
      finished = "Focusing...";
    }
  } else {
    // fallback if no productive segments: use first clipped segment start and last end if available
    const first = clippedSegments[0];
    started = formatTimeLocal(first.clippedStart, timezone);
    const last = clippedSegments[clippedSegments.length - 1];
    finished = last.originalEnd ? formatTimeLocal(last.originalEnd, timezone) : "Focusing...";
  }

  const summary = [
    { label: "Total", value: formatDuration(totalDuration) },
    { label: "Max Focus", value: formatDuration(maxFocus) },
    { label: "Started", value: started },
    { label: "Finished", value: finished },
  ];

  // Focus area aggregation (minutes) — use clippedSeconds
  const focusAreaMap: Record<string, { name: string; value: number; color: string }> = {};
  for (const s of clippedSegments) {
    if (s.type === "BREAK") continue;
    if (!s.focusAreaName) continue;
    const key = s.focusAreaName || "Other";
    if (!focusAreaMap[key]) {
      focusAreaMap[key] = {
        name: key,
        value: 0,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
      };
    }
    focusAreaMap[key].value += (s.clippedSeconds || 0) / 60;
  }
  const focusAreaData = Object.values(focusAreaMap);

  // Activity type aggregation (minutes)
  const activityMap: Record<string, { name: string; value: number; color: string }> = {
    Productive: { name: "Productive", value: 0, color: "#4CAF50" },
    Other: { name: "Other", value: 0, color: "#9E9E9E" },
  };

  for (const s of clippedSegments) {
    const durationMinutes = (s.clippedSeconds || 0) / 60;
    if (s.type === "BREAK" && s.label) {
      const breakName = s.label;
      if (!activityMap[breakName]) {
        activityMap[breakName] = {
          name: breakName,
          value: 0,
          color: "#F44336",
        };
      }
      activityMap[breakName].value += durationMinutes;
    } else if (s.focusAreaName) {
      activityMap.Productive.value += durationMinutes;
    } else {
      activityMap.Other.value += durationMinutes;
    }
  }

  const activityTypeData = Object.values(activityMap);

  // Return clipped segments too so UI can present per-day slices if desired
  const outSegments = clippedSegments.map(s => ({
    id: s.id,
    displayStart: s.clippedStart,
    displayEnd: s.clippedEnd,
    displayDuration: s.clippedSeconds,
    type: s.type,
    label: s.label,
    focusAreaName: s.focusAreaName,
    isRunning: s.isRunning,
  }));

  return { summary, focusAreaData, activityTypeData, segments: outSegments };
}
