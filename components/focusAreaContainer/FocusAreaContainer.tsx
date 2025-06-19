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
  isRunning: boolean
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
  isRunning
}: Props) {

   const [activeId, setActiveId] = useState<string | null>(null);
  return (
    <div>
      <div className="flex flex-col gap-4 w-full max-w-xl">
        {focusAreas.map((focusArea) => {
          const focusAreaTodos = todos.filter(
            (t) => t.focusAreaId === focusArea.id
          );
          return (
            <div
              key={focusArea.id}
              className="bg-white/10 border border-white/20 backdrop-blur-lg rounded-xl p-4 shadow-lg hover:shadow-2xl transition duration-300"
            >
              <FocusAreaComp
                focusArea={focusArea}
                //   onUpdate={handleUpdate}
                todos={focusAreaTodos}
                timeSpent={timeSpent.find(m => m.focusAreaId === focusArea.id)?.totalDuration ?? 0}
                handleStart={handleStart}
                handleStop={handleStop}
                setIsRunning={setIsRunning}
                setStartTime={setStartTime}
                setTime={setTime}
                isRunning={isRunning}
                isActive={focusArea.id === activeId}
                 onActivate={() => setActiveId(focusArea.id)}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-auto w-full max-w-xl flex flex-col-reverse sm:flex-row sm:justify-end items-center gap-4">
      <div className="bg-white/10 border border-white/20 rounded-xl p-3 backdrop-blur-md hover:scale-105 hover:shadow-xl transition">
        <CreateFocusArea />
      </div>
    </div>
    </div>
  );
}
