// lib/useChartData.ts
import { useQuery } from '@tanstack/react-query';

type CalendarEntry = {
  date: string;         // ISO string
  totalSeconds: number;
};

export function useChartData(userId: string) {
  return useQuery<CalendarEntry[]>({
    queryKey: ['calendar-data', userId],
    queryFn: async () => {
      const res = await fetch(`/api/chart-data?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch calendar data');
      return res.json();
    },
  });
}
