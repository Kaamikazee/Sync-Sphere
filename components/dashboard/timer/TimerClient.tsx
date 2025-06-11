"use client";

import { useEffect } from "react";
import { ActiTimerComp } from "@/components/dashboard/timer/ActiTimerComp";
import { CreateActivity } from "@/components/dashboard/timer/CreateActivity";
import { Activity, Group } from "@prisma/client";
import { TimerContainer } from "./TimerContainer";
import {
  TimersProvider,
  useTimers,
} from "@/components/dashboard/timer/TimersContext";
import { SthElse } from "./SthElse";
// import Leaderboard from "../group/leaderboard/Leaderboard";

interface Props {
  activities: Activity[];
  userId: string
  groups: Group[]
}

export default function TimerClient({ activities, userId, groups }: Props) {
  return (
    <TimersProvider>
      <TimerClientInner activities={activities} userId={userId} groups={groups} />
    </TimersProvider>
  );
}

function TimerClientInner({ activities, userId, groups }: Props) {
  const { setTimes, totalSeconds } = useTimers();

  useEffect(() => {
    const initial: Record<string, number> = {};
    activities.forEach((a) => (initial[a.id] = a.timeSpent));
    setTimes(initial);
  }, [activities, setTimes]);

  const handleUpdate = (newTime: number, id: string) => {
    setTimes((prev) => ({ ...prev, [id]: newTime }));
  };

  return (
    <div className="grid grid-cols-2">
      <div>
        <div className="flex flex-col items-center gap-4 h-full">
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
        </div>
      </div>
      <div>
        {/* <Leaderboard /> */}
        <SthElse groups={groups} userId={userId}/>
      </div>
    </div>
  );
}
