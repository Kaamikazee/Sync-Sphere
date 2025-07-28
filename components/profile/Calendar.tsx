"use client";
import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { useCalendarData } from "@/lib/useCalendar";

interface Props {
  userId: string;
}

function getColorBySeconds(seconds: number) {
  if (seconds >= 7200) return "bg-orange-600";
  if (seconds >= 3600) return "bg-orange-500";
  if (seconds >= 1800) return "bg-orange-300";
  if (seconds > 0) return "bg-orange-100";
  return "bg-gray-800 text-gray-400";
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatHMS(total: number) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

export default function CalendarComp({ userId }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 6));
  const [selectedDay, setSelectedDay] = useState<{ date: Date; seconds: number } | null>(null);

  const { data: logs, isLoading, error } = useCalendarData(userId);

  if (isLoading) return <div className="text-center">Loading...</div>;
  if (error)
    return <div className="text-center text-red-400">Error loading data</div>;

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          ←
        </button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-500 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array(start.getDay())
          .fill(null)
          .map((_, i) => (
            <div key={`empty-${i}`} className="h-16"></div>
          ))}

        {days.map((day) => {
          const entry = logs?.find((d) => isSameDay(new Date(d.date), day));
          const seconds = entry?.totalSeconds ?? 0;
          const color = getColorBySeconds(seconds);

          return (
            <div
              key={day.toISOString()}
              className={`h-16 rounded-lg p-1 text-xs flex flex-col items-center justify-center cursor-pointer ${color}`}
              onClick={() => setSelectedDay({ date: day, seconds })}
            >
              <div className="font-semibold">{format(day, "d")}</div>
              <div className="text-[10px]">
                {seconds ? formatTime(seconds) : "Off"}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 p-3 bg-zinc-500 rounded-lg text-sm">
          <div>
            <strong>Date:</strong> {format(selectedDay.date, "EEE, d MMM yyyy")}
          </div>
          <div>
            <strong>Recorded:</strong>{" "}
            {selectedDay.seconds ? formatHMS(selectedDay.seconds) : "Day Off"}
          </div>
        </div>
      )}
    </div>
  );
}
