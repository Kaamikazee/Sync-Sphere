// app/actions/getDailyStats.ts (server action)
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


// date: "YYYY-MM-DD"
// timezoneOffsetMinutes: number of minutes east of UTC (IST -> 330). Optional, defaults to 0.
export async function getDailyStats(
  userId: string,
  date: string,
  // timezoneOffsetMinutes = 0
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

  // const offset = Number(timezoneOffsetMinutes) || 0; // minutes east of UTC
  const timezone = user.timezone ?? "Asia/Kolkata";
    const resetHour = user.resetHour ?? 0;
  
    // Pick the base date (user-specified or today)
    const baseDate = date ? new Date(date) : new Date();
  
    // Get that day's start & end in UTC according to user's timezone/resetHour
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
  .filter(
    (seg) =>
      seg.focusArea?.name &&
      seg.type !== "BREAK"
  )
  .reduce((sum, seg) => sum + (seg.duration || 0), 0);
  const productiveDurations = segments
    .filter((s) => s.type !== "BREAK")
    .map((s) => s.duration || 0);
  const maxFocus = productiveDurations.length ? Math.max(...productiveDurations) : 0;

  // Helper - deterministically format a UTC timestamp into user's local HH:mm
  function formatTimeLocal(date: Date, timezone: string) {
  return date.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
}


  const started = formatTimeLocal(segments[0].start, timezone);
  // while calculating last, check if the segment type is not "BREAK" and segment.focusArea?.name is defined then only consider it
  const last = segments.filter(s => s.type !== "BREAK" && s.focusArea?.name).slice(-1)[0] || {};
  // If last segment is still running, use current time
  const finished = last.end ? formatTimeLocal(last.end, timezone) : "Focusing...";

  const summary = [
    { label: "Total", value: formatDuration(totalDuration) },
    { label: "Max Focus", value: formatDuration(maxFocus) },
    { label: "Started", value: started },
    { label: "Finished", value: finished },
  ];

  // Focus area aggregation (minutes)
  const focusAreaMap: Record<string, { name: string; value: number; color: string }> = {};
  for (const s of segments) {
    // Here need to change, take only those which has s.type !== "BREAK"
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
