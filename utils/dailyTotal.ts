// utils/dailyTotal.ts
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";

export const getDailyTotalForUser = async (
  userId: string,
  timezone = "Asia/Kolkata",
  resetHour = 0
) => {
  const { startUtc } = getUserDayRange({ timezone, resetHour }, new Date());
  const today = startUtc;

  // Fetch or create the daily aggregate
  let dailyTotal = await db.dailyTotal.findUnique({
    where: { userId_date: { userId, date: today } },
    select: {
      totalSeconds: true,
      user: { select: { id: true, name: true, image: true } },
    },
  });

  if (!dailyTotal) {
    dailyTotal = await db.dailyTotal.create({
      data: { userId, date: today, totalSeconds: 0 },
      select: {
        totalSeconds: true,
        user: { select: { id: true, name: true, image: true } },
      },
    });
  }

  // RunningTimer presence = user is running
  const running = await db.runningTimer.findUnique({
    where: { userId },
    select: {
      startTimestamp: true,
      segmentId: true,
    },
  });

  return {
    ...dailyTotal,
    isRunning: !!running,
    startTimestamp: running?.startTimestamp ?? null,
    segmentId: running?.segmentId ?? null,
  };
};
