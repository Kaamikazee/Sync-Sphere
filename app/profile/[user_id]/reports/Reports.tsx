// app/.../Reports.tsx
"use client";

import { getDailyStats } from "@/app/actions/getDailyStats";
import { CalendarComp } from "@/components/profile/Calendar";
import { StatsWithCharts } from "@/components/profile/reports/StatsWithCharts";
import { useState, useEffect } from "react";
import { formatInTimeZone } from "date-fns-tz";

type SummaryItem = { label: string; value: string };
type ChartDataItem = { name: string; value: number; color: string };

function getDateInUserTZ(timezone: string) {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}


const Reports = ({ user_id, user_timezone }: { user_id: string, user_timezone: string }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getDateInUserTZ(user_timezone)
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
        const { summary, focusAreaData, activityTypeData } = await getDailyStats(
          user_id,
          selectedDate,
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
