"use client";

import { getDailyStats } from "@/app/actions/getDailyStats";
import { CalendarComp } from "@/components/profile/Calendar";
import { StatsWithCharts } from "@/components/profile/reports/StatsWithCharts";
import { useState, useEffect } from "react";

type SummaryItem = { label: string; value: string };
type ChartDataItem = { name: string; value: number; color: string };

const Reports = ({ user_id }: { user_id: string }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [focusAreaData, setFocusAreaData] = useState<ChartDataItem[]>([]);
  const [activityTypeData, setActivityTypeData] = useState<ChartDataItem[]>([]);

  useEffect(() => {
    if (!selectedDate) return;
    (async () => {
      try {
        const isoDate = selectedDate.toISOString().split("T")[0]; // YYYY-MM-DD
        const { summary, focusAreaData, activityTypeData } = await getDailyStats(user_id, isoDate);
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
      <CalendarComp 
        userId={user_id} 
        onDaySelect={setSelectedDate} 
      />

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
