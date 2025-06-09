"use client";

import { useState, useEffect, useMemo } from "react";
import { ActiTimerComp } from "@/components/dashboard/timer/ActiTimerComp";
import { CreateActivity } from "@/components/dashboard/timer/CreateActivity";
import { Activity } from "@prisma/client";
import { TimerContainer } from "./TimerContainer";

interface Props {
  activities: Activity[];
}

export default function TimerClient({ activities }: Props) {
  const [times, setTimes] = useState<Record<string, number>>({});

  // initialize state from props once
  useEffect(() => {
    const initial: Record<string, number> = {};
    activities.forEach((a) => (initial[a.id] = a.timeSpent));
    setTimes(initial);
  }, [activities]);

  const handleUpdate = (newTime: number, id: string) => {
    setTimes((prev) => ({ ...prev, [id]: newTime }));
  };

  const totalSeconds = useMemo(
    () => Object.values(times).reduce((sum, t) => sum + t, 0),
    [times]
  );

  return (
    <main className="flex flex-col items-center gap-4 h-full">
        <div className="w-[100%]">

      <TimerContainer totalSeconds={totalSeconds} />
        </div>

      <div className="flex flex-col gap-2 w-full sm:w-2/3">
        {activities.map((activity) => (
          <ActiTimerComp
            key={activity.id}
            activity={activity}
            onUpdate={handleUpdate}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col-reverse sm:flex-row sm:justify-end items-center gap-4">
        <CreateActivity />
      </div>
    </main>
  );
}
