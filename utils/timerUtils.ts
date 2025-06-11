// src/utils/timerUtils.ts
import { Activity } from "@prisma/client";

export function computeUserTotals(
  activities: Activity[],
  times: Record<string, number>
): Record<string, number> {
  const userTotals: Record<string, number> = {};
  for (const act of activities) {
    const t = times[act.id] ?? act.timeSpent;
    userTotals[act.userId] = (userTotals[act.userId] || 0) + t;
  }
  return userTotals;
}
