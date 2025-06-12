"use client";

import { useEffect } from "react";
import { ActiTimerComp } from "@/components/dashboard/timer/ActiTimerComp";
import { CreateActivity } from "@/components/dashboard/timer/CreateActivity";
import { Activity, Group, Todo } from "@prisma/client";
import { TimerContainer } from "./TimerContainer";
import { TimersProvider, useTimers } from "@/components/dashboard/timer/TimersContext";
import { SthElse } from "./SthElse";

interface Props {
  activities: Activity[];
  userId: string;
  groups: Group[];
  todos: Todo[];
}

export default function TimerClient({ activities, userId, groups, todos }: Props) {
  return (
    <TimersProvider>
      <TimerClientInner
        activities={activities}
        userId={userId}
        groups={groups}
        todos={todos}
      />
    </TimersProvider>
  );
}

function TimerClientInner({ activities, userId, groups, todos }: Props) {
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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-4 bg-gradient-to-br from-sky-800/40 via-purple-800/30 to-indigo-800/40 backdrop-blur-sm">
  {/* Left Column: Timer and Activities */}
  <section className="flex flex-col items-center gap-6 w-full">
    
    {/* Timer with card-like gradient */}
    <div className="w-full max-w-xl">
      <div className="bg-gradient-to-r from-cyan-500/40 via-sky-500/30 to-indigo-600/40 p-6 rounded-2xl shadow-xl border border-white/20 backdrop-blur-md hover:shadow-2xl transition-all duration-300">
        <TimerContainer totalSeconds={totalSeconds} />
      </div>
    </div>

    {/* Activities List */}
    <div className="flex flex-col gap-4 w-full max-w-xl">
      {activities.map((activity) => {
        const activityTodos = todos.filter((t) => t.activityId === activity.id);
        return (
          <div
            key={activity.id}
            className="bg-white/10 border border-white/20 backdrop-blur-lg rounded-xl p-4 shadow-lg hover:shadow-2xl transition duration-300"
          >
            <ActiTimerComp
              activity={activity}
              onUpdate={handleUpdate}
              todos={activityTodos}
            />
          </div>
        );
      })}
    </div>

    {/* Create Button Section */}
    <div className="mt-auto w-full max-w-xl flex flex-col-reverse sm:flex-row sm:justify-end items-center gap-4">
      <div className="bg-white/10 border border-white/20 rounded-xl p-3 backdrop-blur-md hover:scale-105 hover:shadow-xl transition">
        <CreateActivity />
      </div>
    </div>
  </section>

  {/* Right Column: Sidebar */}
  <aside className="w-full">
    <div className="p-4 h-full">
      <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 h-full">
        <SthElse groups={groups} userId={userId} />
      </div>
    </div>
  </aside>
</div>

  );
}
