// components/dashboard/timer/TimersContext.tsx
"use client";

import { createContext, useContext, useState, useMemo } from "react";

interface TimersContextProps {
  times: Record<string, number>;
  setTimes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  totalSeconds: number;
}

const TimersContext = createContext<TimersContextProps | undefined>(undefined);

export const useTimers = () => {
  const context = useContext(TimersContext);
  if (!context) {
    throw new Error("useTimers must be used within a TimersProvider");
  }
  return context;
};

export const TimersProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [times, setTimes] = useState<Record<string, number>>({});

  const totalSeconds = useMemo(
    () => Object.values(times).reduce((sum, t) => sum + t, 0),
    [times]
  );

  return (
    <TimersContext.Provider value={{ times, setTimes, totalSeconds }}>
      {children}
    </TimersContext.Provider>
  );
};
