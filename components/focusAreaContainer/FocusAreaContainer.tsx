import { FocusArea, Todo } from "@prisma/client";
import { FocusAreaComp } from "./FocusAreaComp";
import { CreateFocusArea } from "./CreateFocusArea";
import { FocusAreTotalsById } from "@/lib/api";
import { useState } from "react";

interface Props {
  focusAreas: FocusArea[];
  todos: Todo[];
  timeSpent: FocusAreTotalsById[];
  handleStart: () => void;
  handleStop: () => void;
  setStartTime: (arg: number) => void;
  setIsRunning: (arg: boolean) => void;
  setTime: (arg: number) => void;
  isRunning: boolean;
  isToday: boolean;
}

export default function FocusAreaContainer({
  focusAreas,
  todos,
  timeSpent,
  handleStart,
  handleStop,
  setIsRunning,
  setStartTime,
  setTime,
  isRunning,
  isToday,
}: Props) {
// console.log("TIME SPENT", timeSpent, focusAreas);

   const [activeId, setActiveId] = useState<string | null>(null);
  return (
  <div className="w-full px-4 sm:px-0">
    {/* Focus Area Cards */}
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {focusAreas.map((focusArea) => {
        const focusAreaTodos = todos.filter(
          (t) => t.focusAreaId === focusArea.id
        );

        const duration = timeSpent?.find(
          (m) => m.focusAreaId === focusArea.id
        )?.totalDuration ?? 0;

        return (
          <div
            key={focusArea.id}
            className="bg-white/10 border border-white/20 backdrop-blur-lg rounded-xl p-4 transition-all duration-300 hover:shadow-none sm:hover:shadow-xl"
          >
            <FocusAreaComp
              focusArea={focusArea}
              todos={focusAreaTodos}
              timeSpent={duration}
              handleStart={handleStart}
              handleStop={handleStop}
              setIsRunning={setIsRunning}
              setStartTime={setStartTime}
              setTime={setTime}
              isRunning={isRunning}
              isActive={focusArea.id === activeId}
              onActivate={() => setActiveId(focusArea.id)}
              isToday={isToday}
            />
          </div>
        );
      })}
    </div>

    {/* Bottom Buttons */}
    {isToday && <div className="mt-6 w-full max-w-2xl mx-auto flex flex-col-reverse sm:flex-row sm:justify-end items-center gap-4">
      <div className="bg-white/10 border border-white/20 rounded-xl p-3 backdrop-blur-md transition-all duration-300 sm:hover:scale-105 sm:hover:shadow-xl">
        <CreateFocusArea />
      </div>
    </div>}
  </div>
);

}
