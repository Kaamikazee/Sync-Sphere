// components/BreakTimerWidget.tsx
"use client";

import { useEffect, useState } from "react";
import { useBreakTimer } from "@/stores/useBreakTimer";

function format(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export const BreakTimerWidget = () => {
  const { isRunning, startTime, duration } = useBreakTimer();
  const [liveDuration, setLiveDuration] = useState(duration);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setLiveDuration(duration + elapsed);
      }, 1000);
    } else {
      setLiveDuration(duration);
    }

    return () => clearInterval(interval);
  }, [isRunning, startTime, duration]);

  if (!isRunning && duration === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm z-50">
      💤 Break Time: {format(liveDuration)}
    </div>
  );
};
