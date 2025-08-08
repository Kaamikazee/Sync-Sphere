// app/.../Reports.tsx
"use client";

import { getDailyStats } from "@/app/actions/getDailyStats";
import { CalendarComp } from "@/components/profile/Calendar";
import { StatsWithCharts } from "@/components/profile/reports/StatsWithCharts";
import { useState, useEffect } from "react";

type SummaryItem = { label: string; value: string };
type ChartDataItem = { name: string; value: number; color: string };

function getLocalDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const Reports = ({ user_id }: { user_id: string }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    getLocalDateString(new Date())
  );
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [focusAreaData, setFocusAreaData] = useState<ChartDataItem[]>([]);
  const [activityTypeData, setActivityTypeData] = useState<ChartDataItem[]>(
    []
  );

  useEffect(() => {
    if (!selectedDate) return;

    (async () => {
      try {
        // getTimezoneOffset() returns minutes to *add* to local to get UTC.
        // We want "minutes east of UTC" so invert the sign.
        const tzOffsetMinutes = -new Date().getTimezoneOffset(); // e.g. IST -> 330

        const { summary, focusAreaData, activityTypeData } = await getDailyStats(
          user_id,
          selectedDate,
          tzOffsetMinutes
        );

        setSummary(summary);
        setFocusAreaData(focusAreaData);
        setActivityTypeData(activityTypeData);
      } catch (err) {
        console.error("Failed to fetch daily stats:", err);
      }
    })();
  }, [selectedDate, user_id]);

  return (
    <div>
      <CalendarComp userId={user_id} onDaySelect={setSelectedDate} />

      {selectedDate && (
        <div className="p-6">
          <StatsWithCharts
            summary={summary}
            focusAreaData={focusAreaData}
            activityTypeData={activityTypeData}
            userId={user_id}
          />
        </div>
      )}
    </div>
  );
};

export default Reports;
