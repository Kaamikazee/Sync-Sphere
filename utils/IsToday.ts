import { DateTime } from "luxon";

export function getUserDayRange(user: { timezone: string; resetHour: number }, forDate?: Date) {
  const nowLocal = DateTime.fromJSDate(forDate ?? new Date(), { zone: user.timezone });
  let dayStart = nowLocal.startOf("day").plus({ hours: user.resetHour });

  if (nowLocal.hour < user.resetHour) {
    dayStart = dayStart.minus({ days: 1 });
  }

  const dayEnd = dayStart.plus({ days: 1 });

  return {
    startUtc: dayStart.toUTC().toJSDate(),
    endUtc: dayEnd.toUTC().toJSDate(),
  };
}
