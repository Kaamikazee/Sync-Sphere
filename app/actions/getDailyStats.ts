"use server";

import { format } from "date-fns";
import db from "@/lib/db";
// import { startOfDay, endOfDay } from "date-fns";




function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h > 0 ? `${h}h ` : ""}${m}m`;
}

export async function getDailyStats(userId: string, date: string) {
  const startOfDay = new Date(date + "T00:00:00.000Z");
  const endOfDay = new Date(date + "T23:59:59.999Z");
//   const startOfDayUTC = startOfDay(new Date(date));
// const endOfDayUTC = endOfDay(new Date(date));

  const segments = await db.timerSegment.findMany({
    where: {
      userId,
      date: { gte: startOfDay, lt: endOfDay },
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

  console.log(`USER ID: ${userId}, with segments: & total hrs`, segments, segments[0].focusArea?.name, formatDuration(segments[0].duration!));
  const seg2 = await db.timerSegment.findMany({
     where: {
      userId,
      date: { gte: startOfDay, lt: endOfDay },
    }
  })
  console.log(`SEGG22:`, seg2);
  

  if (!segments.length) {
    return { summary: [], focusAreaData: [], activityTypeData: [] };
  }

  const totalSeconds = segments.reduce((sum, s) => sum + s.duration!, 0);

  const productiveDurations = segments
    .filter(s => s.type !== "BREAK")
    .map(s => s.duration ?? 0)
  const maxFocus = productiveDurations.length
    ? Math.max(...productiveDurations)
    : 0;

  const started = format(new Date(segments[0].start), "HH:mm");
  const last = segments[segments.length - 1];
  const finished = last.end
    ? format(new Date(last.end), "HH:mm")
    : "studying...";

  const summary = [
    { label: "Total", value: formatDuration(totalSeconds) },
    { label: "Max Focus", value: formatDuration(maxFocus) },
    { label: "Started", value: started },
    { label: "Finished", value: finished },
  ];

  const focusAreaMap: Record<
    string,
    { name: string; value: number; color: string }
  > = {};

  for (const s of segments) {
    if (!focusAreaMap[s.label || "Unknown"]) {
      focusAreaMap[s.label || "Unknown"] = {
        name: s.label || "Unknown",
        value: 0,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      };
    }
    focusAreaMap[s.label || "Unknown"].value += s.duration! / 60;
  }
  const focusAreaData = Object.values(focusAreaMap);

  const activityMap = {
    Productive: { name: "Productive", value: 0, color: "#4CAF50" },
    Break: { name: "Break", value: 0, color: "#F44336" },
    Other: { name: "Other", value: 0, color: "#9E9E9E" },
  };

  for (const s of segments) {
    if (s.type === "BREAK") {
      activityMap.Break.value += s.duration! / 60;
    } else if (s.focusArea?.name) {
      activityMap.Productive.value += s.duration! / 60;
    } else {
      activityMap.Other.value += s.duration! / 60;
    }
  }
  const activityTypeData = Object.values(activityMap);

  return { summary, focusAreaData, activityTypeData };
}
