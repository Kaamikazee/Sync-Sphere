// utils/normalizeDate.ts
export function normalizeToStartOfDayIST(date: Date): Date {
  const IST_OFFSET_MINUTES = 330; // 5 hours 30 minutes
  const istTime = new Date(date.getTime() + IST_OFFSET_MINUTES * 60000);
  const startOfISTDay = new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
  return new Date(startOfISTDay.getTime() - IST_OFFSET_MINUTES * 60000); // back to UTC
}