"use client";

import { useEffect, useState } from "react";
import { useRunningStore } from "@/stores/useGlobalTimer";

export function formatHMS(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
}

export const SessionTimerWidget = () => {
  const { running } = useRunningStore();
  const [currentSessionTime, setCurrentSessionTime] = useState<number>(0);

  // ✅ Restore on refresh
  useEffect(() => {
    const startTime = localStorage.getItem("focusStartTime");
    if (startTime) {
      useRunningStore.getState().setRunning(true);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (running) {
      const startTime = localStorage.getItem("focusStartTime");
      let startTimestamp: number;

      if (!startTime) {
        startTimestamp = Date.now();
        localStorage.setItem("focusStartTime", startTimestamp.toString());
      } else {
        startTimestamp = parseInt(startTime);
      }

      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
        setCurrentSessionTime(elapsed);
      }, 1000);
    } else {
      localStorage.removeItem("focusStartTime");
      setCurrentSessionTime(0);
    }

    return () => clearInterval(interval);
  }, [running]);

  if (!running && currentSessionTime === 0) return null;

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-gradient-to-r from-white/20 via-white/10 to-white/5 text-white border border-white/20 backdrop-blur-lg rounded-lg shadow-md text-xs sm:text-sm font-medium w-[75%] sm:w-[90%] max-w-xs px-1 sm:px-3 text-center">
      <span className="font-mono truncate block">
        ⏱️ Focused for {formatHMS(currentSessionTime)}
      </span>
    </div>
  );
};
