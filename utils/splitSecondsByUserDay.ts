import { getUserDayRange } from "./IsToday";

export function splitSecondsByUserDay(
  start: Date,
  end: Date,
  timezone: string,
  resetHour: number
): Array<{ date: Date; seconds: number }> {
  if (end <= start) return [];

  const parts: Array<{ date: Date; seconds: number }> = [];

  // cursor walks from start to end
  let cursor = new Date(start);

  while (cursor < end) {
    const { startUtc: dayStartUtc } = getUserDayRange({ timezone, resetHour }, cursor);
    // startUtc is the UTC Date representing the start of the user's day containing cursor
    // compute next day startUtc:
    const nextDayStartUtc = new Date(dayStartUtc.getTime() + 24 * 3600 * 1000);

    // the portion of this session that belongs to the current user-day ends at either end or nextDayStartUtc
    const segmentEnd = new Date(Math.min(end.getTime(), nextDayStartUtc.getTime()));

    const secs = Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000);
    const keyDate = new Date(dayStartUtc); // ensure a fresh Date object

    // if secs is 0 (edge cases), still add maybe? We skip zero increments to avoid no-op upserts
    if (secs > 0) {
      parts.push({ date: keyDate, seconds: secs });
    }

    // advance cursor
    cursor = segmentEnd;
  }

  // merge parts for same date (in case of weird boundaries)
  const merged = new Map<string, number>();
  for (const p of parts) {
    const iso = p.date.toISOString();
    merged.set(iso, (merged.get(iso) ?? 0) + p.seconds);
  }

  return Array.from(merged.entries()).map(([iso, seconds]) => ({ date: new Date(iso), seconds }));
}