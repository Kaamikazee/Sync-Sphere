// utils/normalizeDate.ts
export function normalizeToStartOfDay(date: Date): Date {
 return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}