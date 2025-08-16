// utils/dailyTotal.ts (server-side)
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";

export const getDailyTotalForUser = async (
  userId: string,
  timezone = "Asia/Kolkata",
  resetHour = 0
) => {
  const { startUtc } = getUserDayRange({ timezone, resetHour }, new Date());
  const today = startUtc;

  let dailyTotal = await db.dailyTotal.findUnique({
    where: { userId_date: { userId, date: today } },
    select: {
      totalSeconds: true,
      isRunning: true,
      startTimestamp: true,
      user: { select: { id: true, name: true, image: true } },
    },
  });

  if (!dailyTotal) {
    dailyTotal = await db.dailyTotal.create({
      data: { userId, date: today, totalSeconds: 0 },
      select: {
        totalSeconds: true,
        isRunning: true,
        startTimestamp: true,
        user: { select: { id: true, name: true, image: true } },
      },
    });
  }

  return dailyTotal;
};
