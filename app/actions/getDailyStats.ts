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

// Helper - deterministically format a UTC timestamp into user's local HH:mm
function formatTimeLocal(date: Date | string, timezone: string) {
  return new Date(date).toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
}

// date: "YYYY-MM-DD"
export async function getDailyStats(
  userId: string,
  date: string
) {
  // parse date
  const [yStr, mStr, dStr] = date.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) {
    throw new Error("Invalid date format, expected YYYY-MM-DD");
  }

  const session = await checkIfUserCompleteOnboarding("/dashboard")
  const user = session.user

  const timezone = user.timezone ?? "Asia/Kolkata";
  const resetHour = user.resetHour ?? 0;

  const baseDate = date ? new Date(date) : new Date();

  const { startUtc: startUTC, endUtc: endUTC } = getUserDayRange(
    { timezone, resetHour },
    baseDate
  );

  const segments = await db.timerSegment.findMany({
    where: {
      userId,
      start: { gte: startUTC, lte: endUTC },
    },
    select: {
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
    return { summary: [], focusAreaData: [], activityTypeData: [] };
  }

  const totalDuration = segments
    .filter((seg) => seg.focusArea?.name && seg.type !== "BREAK")
    .reduce((sum, seg) => sum + (seg.duration || 0), 0);
  const productiveDurations = segments
    .filter((s) => s.type !== "BREAK")
    .map((s) => s.duration || 0);
  const maxFocus = productiveDurations.length ? Math.max(...productiveDurations) : 0;

  // New robust started/finished logic
  const productiveSegments = segments.filter(s => s.type !== "BREAK" && s.focusArea?.name);

  // If there are productive segments, compute earliest start and the "latest" segment
  let started: string;
  let finished: string;

  if (productiveSegments.length > 0) {
    // earliest start among productive segments
    const earliest = productiveSegments.reduce((min, s) =>
      new Date(s.start) < new Date(min.start) ? s : min,
      productiveSegments[0]
    );
    started = formatTimeLocal(earliest.start, timezone);

    // pick the segment with the latest timestamp using end when available, otherwise start
    const latest = productiveSegments.reduce((latestSoFar, s) => {
      const latestTime = latestSoFar.end ? new Date(latestSoFar.end).getTime() : new Date(latestSoFar.start).getTime();
      const sTime = s.end ? new Date(s.end).getTime() : new Date(s.start).getTime();
      return sTime > latestTime ? s : latestSoFar;
    }, productiveSegments[0]);

    if (latest.end) {
      // show actual end time even if it is after endUTC (e.g., ended after midnight)
      finished = formatTimeLocal(latest.end, timezone);
    } else {
      finished = "Focusing...";
    }
  } else {
    // fallback: no productive segments (maybe only breaks) — use first segment start for "Started"
    started = formatTimeLocal(segments[0].start, timezone);
    // if the last segment in the day has an end, show it; otherwise still "Focusing..."
    const lastSeg = segments.slice(-1)[0];
    finished = lastSeg?.end ? formatTimeLocal(lastSeg.end, timezone) : "Focusing...";
  }

  const summary = [
    { label: "Total", value: formatDuration(totalDuration) },
    { label: "Max Focus", value: formatDuration(maxFocus) },
    { label: "Started", value: started },
    { label: "Finished", value: finished },
  ];

  // Focus area aggregation (minutes)
  const focusAreaMap: Record<string, { name: string; value: number; color: string }> = {};
  for (const s of segments) {
    if (s.type === "BREAK") continue; // Skip breaks for focus area aggregation
    if (!s.focusArea?.name) continue; // Skip segments without focus area
    const key = s.focusArea.name || "Other";
    if (!focusAreaMap[key]) {
      focusAreaMap[key] = {
        name: key,
        value: 0,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
      };
    }
    focusAreaMap[key].value += (s.duration || 0) / 60;
  }
  const focusAreaData = Object.values(focusAreaMap);

  // Activity type aggregation (minutes)
  const activityMap: Record<string, { name: string; value: number; color: string }> = {
    Productive: { name: "Productive", value: 0, color: "#4CAF50" },
    Other: { name: "Other", value: 0, color: "#9E9E9E" },
  };

  for (const s of segments) {
    const durationMinutes = (s.duration || 0) / 60;

    if (s.type === "BREAK" && s.label) {
      const breakName = s.label;
      if (!activityMap[breakName]) {
        activityMap[breakName] = {
          name: breakName,
          value: 0,
          color: "#F44336", // or maybe a random color generator
        };
      }
      activityMap[breakName].value += durationMinutes;

    } else if (s.focusArea?.name) {
      activityMap.Productive.value += durationMinutes;

    } else {
      activityMap.Other.value += durationMinutes;
    }
  }

  const activityTypeData = Object.values(activityMap);

  return { summary, focusAreaData, activityTypeData };
}
