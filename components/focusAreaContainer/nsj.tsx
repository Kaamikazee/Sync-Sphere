"use client";

import { CreateTodo } from "@/components/todo/CreateTodo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FocusArea, Todo } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Edit, PauseCircle, Trash2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UpdateTodo } from "@/components/todo/UpdateTodo";
import { useRunningStore } from "@/stores/useGlobalTimer";
import { useBreakStore } from "@/stores/useBreakStore";
import { ResumeTimer } from "./ResumeTimer";
import { toast } from "sonner";
import { useBreakTimer } from "@/stores/useBreakTimer";
import { cn } from "@/lib/utils";

const iconVariants = {
  hover: { scale: 1.2, rotate: 10 },
  tap: { scale: 0.9, rotate: -10 },
};

interface Props {
  focusArea: FocusArea;
  todos: Todo[];
  timeSpent: number;
  isRunning: boolean;
  isToday: boolean;
  handleStart: () => void;
  handleStop: () => void;
  setStartTime: (arg: number) => void;
  setIsRunning: (arg: boolean) => void;
  setTime: (arg: number) => void;
  // id: string,
  isActive: boolean;
  onActivate: () => void;
}

export function FocusAreaComp({
  focusArea: { name, id: focusAreaId },
  timeSpent,
  isRunning,
  todos,
  handleStart,
  handleStop,
  setIsRunning,
  setStartTime,
  setTime,
  isActive,
  onActivate,
  isToday,
}: Props) {
  // const [timeSpent] = useState(OldTimeSpent);
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const running = useRunningStore((s) => s.running);
  const setRunning = useRunningStore((s) => s.setRunning);
  const [IsFocusRunning, setIsFocusRunning] = useState(false);
  const [displayTime, setDisplayTime] = useState(timeSpent);

  const breakReason = useBreakStore((s) => s.breakReason);

  const stopRequested = useRunningStore((state) => state.stopRequested);
  const resetStop = useRunningStore((state) => state.resetStop);

  const breakTimer = useBreakTimer();

  useEffect(() => {
    if (!IsFocusRunning) {
      setDisplayTime(timeSpent);
    }
  }, [timeSpent, IsFocusRunning]);

  useEffect(() => {
    setRunning(isRunning);
  }, [isRunning, setRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (IsFocusRunning) {
      interval = setInterval(() => {
        setDisplayTime((prev) => {
          const updated = prev + 1;
          localStorage.setItem("activeDisplayTime", updated.toString());
          return updated;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [IsFocusRunning]);

  useEffect(() => {
    const savedDisplay = localStorage.getItem("activeDisplayTime");
    if (savedDisplay && !localStorage.getItem("activeStartTime")) {
      setDisplayTime(parseInt(savedDisplay, 10));
    }
  }, []);

  useEffect(() => {
    setIsFocusRunning(isActive);
  }, [isActive]);

  useEffect(() => {
    const savedSegmentId = localStorage.getItem("activeSegmentId");
    const savedStart = localStorage.getItem("activeStartTime");
    const savedFocusAreaId = localStorage.getItem("activeFocusAreaId");

    if (savedSegmentId && savedStart && savedFocusAreaId === focusAreaId) {
      setSegmentId(savedSegmentId);
      const startMs = new Date(savedStart).getTime();
      setStartTime(startMs);
      setIsRunning(true);

      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      setTime(timeSpent + elapsed);

      setDisplayTime(timeSpent + elapsed);
      setIsFocusRunning(true);
    }
  }, [timeSpent, setIsRunning, setStartTime, setTime, focusAreaId]);

  const { mutate: start } = useMutation({
    mutationFn: async () => {
      const lastBreakEnd = localStorage.getItem("lastBreakEnd");
      const lastBreakStart = localStorage.getItem("lastBreakStart");

      let duration = 0;
      if (lastBreakStart && lastBreakEnd) {
        const startMs = new Date(lastBreakStart).getTime();
        const endMs = new Date(lastBreakEnd).getTime();
        if (!isNaN(startMs) && !isNaN(endMs)) {
          duration = Math.floor((endMs - startMs) / 1000);
        }
      }

      const payload: { focusAreaId: string; breakReason?: string } = {
        focusAreaId,
      };

      if (duration < 3 * 3600) {
        payload.breakReason = breakReason;
      }

      const { data } = await axios.post("/api/simple_timer/start", payload);
      return data;
    },

    onSuccess: (data) => {
      setSegmentId(data.segmentId);
      localStorage.setItem("activeSegmentId", data.segmentId);
      localStorage.setItem("activeStartTime", data.start);

      if (data.lastBreakStart != null && data.lastBreakEnd != null) {
        localStorage.setItem("lastBreakStart", data.lastBreakStart);
        localStorage.setItem("lastBreakEnd", data.lastBreakEnd);
      }
    },
  });

  const onStart = () => {
    setRunning(true);
    handleStart();
    start();
    onActivate();
    localStorage.setItem("activeFocusAreaId", focusAreaId);
    setIsFocusRunning(isActive);
    breakTimer.stop(); // Stop break
    breakTimer.reset(); // Reset for next time
  };

  const { mutate: stop } = useMutation({
    mutationFn: async () => {
      if (!segmentId) throw new Error("No segmentId available");
      const res = await axios.post("/api/simple_timer/stop", {
        segmentId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`${name} logged ${formatHMS(data.duration)} seconds`);
    },
  });

  const onStop = useCallback(() => {
    setRunning(false);
    handleStop();
    stop();
    setIsFocusRunning(false);
    // setIsRunning(false)
    breakTimer.start();

    localStorage.removeItem("activeSegmentId");
    localStorage.removeItem("activeStartTime");
    localStorage.removeItem("activeSegmentId");
    localStorage.removeItem("activeDisplayTime");
    localStorage.removeItem("activeFocusAreaId");
  }, [setRunning, handleStop, stop, setIsFocusRunning, breakTimer]);

  useEffect(() => {
    if (stopRequested) {
      console.log("🛑 Stop triggered in child!");
      onStop(); // 🔥 Actually stops the timer
      resetStop(); // Reset the trigger
    }
  }, [stopRequested, resetStop, onStop]);

  function formatHMS(total: number) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  return (
    <div
      className="flex flex-row items-center justify-between gap-2 sm:gap-4 p-2 sm:p-4 bg-white/10 rounded-xl sm:rounded-2xl shadow-md sm:shadow-2xl border border-white/10 w-full max-w-full overflow-x-auto no-scrollbar"
      style={{ willChange: "transform" }}
    >
      {/* Play / Pause Button */}
      <motion.div
        className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-400 text-white shadow-md sm:shadow-lg rounded-full mr-2"
        whileHover="hover"
        whileTap="tap"
        variants={iconVariants}
        style={{ willChange: "transform" }}
      >
        <AnimatePresence mode="wait">
          {!running && isToday && (
            <motion.div
              key={IsFocusRunning ? "pause" : "play"}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ willChange: "transform" }}
            >
              {IsFocusRunning ? (
                <PauseCircle
                  onClick={onStop}
                  className="cursor-pointer text-white"
                  size={28}
                />
              ) : (
                <ResumeTimer onStart={onStart} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Accordion */}
      <Accordion
        type="single"
        collapsible
        className="flex-1 min-w-[200px] max-w-full sm:max-w-3xl mx-2"
        defaultValue="item-2"
      >
        <AccordionItem
          value="item-1"
          className="bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 text-white shadow-md sm:shadow-lg rounded-xl sm:rounded-2xl px-2 sm:px-6 py-2 hover:shadow-lg sm:hover:shadow-2xl hover:scale-[1.01] transition-transform duration-300"
        >
          <AccordionTrigger className="cursor-pointer flex justify-between items-center w-full text-base sm:text-lg font-medium">
            <span className="truncate w-[60%] sm:w-[40%]">{name}</span>
            <span className="font-bold">{formatHMS(displayTime)}</span>
          </AccordionTrigger>

          <AccordionContent
            className={cn(
              "rounded-lg mt-2 px-3 py-2 font-semibold text-gray-900",
              "bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400",
              "shadow-none sm:shadow-md sm:rounded-xl sm:mt-3 sm:px-5 sm:py-4",
              "backdrop-blur-0 sm:backdrop-blur-md"
            )}
          >
            <div className="flex flex-col gap-4">
              {todos.length === 0 ? (
                <p className="text-sm italic text-gray-100/80">No todos yet</p>
              ) : (
                todos.map((t) => (
                  <div key={t.id} className="w-full">
                    {/* Mobile: no animation | Desktop: motion enabled */}
                    <div className="block sm:hidden">
                      <UpdateTodo todo={t} />
                    </div>

                    <motion.div
                      className="hidden sm:flex items-center gap-2"
                      whileHover={{ scale: 1.03 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <UpdateTodo todo={t} />
                    </motion.div>
                  </div>
                ))
              )}
            </div>
            {isToday && (
              <div className="flex justify-center items-center mt-2">
                <CreateTodo focusAreaId={focusAreaId} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Edit Button */}
      <motion.div
        className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-400 text-white shadow-md sm:shadow-lg rounded-full p-2 ml-2"
        whileHover="hover"
        whileTap="tap"
        variants={iconVariants}
        style={{ willChange: "transform" }}
      >
        <Edit className="cursor-pointer" size={28} />
      </motion.div>

      {/* Delete Button */}
      <motion.div
        className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-400 text-white shadow-md sm:shadow-lg rounded-full p-2 ml-2"
        whileHover="hover"
        whileTap="tap"
        variants={iconVariants}
        style={{ willChange: "transform" }}
      >
        <Trash2 className="cursor-pointer" size={28} />
      </motion.div>
    </div>
  );
}
