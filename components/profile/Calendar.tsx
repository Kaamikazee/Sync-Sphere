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
import { useSwipeable } from "react-swipeable";

interface Props {
  userId: string;
  onDaySelect: (date: Date) => void;
}

function getColorBySeconds(seconds: number) {
  if (seconds >= 7200)
    return "bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-md";
  if (seconds >= 3600)
    return "bg-gradient-to-br from-orange-400 to-pink-400 text-white shadow-md";
  if (seconds >= 1800)
    return "bg-gradient-to-br from-amber-300 to-orange-300 text-black";
  if (seconds > 0)
    return "bg-gradient-to-br from-yellow-100 to-orange-100 text-black";
  return "bg-white/5 text-gray-400 border border-white/10";
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

export function CalendarComp({ userId, onDaySelect }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    seconds: number;
  } | null>(null);

  const { data: logs, isLoading, error } = useCalendarData(userId);

  const handlers = useSwipeable({
    onSwipedLeft: () => setCurrentMonth(addMonths(currentMonth, 1)),
    onSwipedRight: () => setCurrentMonth(subMonths(currentMonth, 1)),
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  if (isLoading) return <div className="text-center">Loading...</div>;
  if (error)
    return <div className="text-center text-red-400">Error loading data</div>;

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });

  return (
    <div
      {...handlers}
      className="w-full max-w-3xl mx-auto p-4 sm:p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-lg transition hover:shadow-2xl"
    >
      {/* Month header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition text-gray-800"
        >
          ←
        </button>
        <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition text-gray-800"
        >
          →
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-300 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Days */}
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
              className={`h-16 rounded-lg p-1 text-xs flex flex-col items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-lg ${color}`}
              onClick={() => {
                setSelectedDay({ date: day, seconds });
                onDaySelect(day);
              }}
            >
              <div className="font-semibold">{format(day, "d")}</div>
              <div className="text-[10px]">
                {seconds ? formatTime(seconds) : "Off"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected day details */}
      {selectedDay && (
        <div className="mt-5 p-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg text-sm text-gray-800">
          <div>
            <strong className="text-pink-300">Date:</strong>{" "}
            {format(selectedDay.date, "EEE, d MMM yyyy")}
          </div>
          <div>
            <strong className="text-pink-300">Recorded:</strong>{" "}
            {selectedDay.seconds ? formatHMS(selectedDay.seconds) : "Day Off"}
          </div>
        </div>
      )}
    </div>
  );
}
