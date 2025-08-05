"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import FocusAreaContainer from "../focusAreaContainer/FocusAreaContainer";
import { FocusArea, Group, PomodoroSettings, Todo } from "@prisma/client";
import Link from "next/link";
import { Button } from "../ui/button";
import { useRunningStore } from "@/stores/useGlobalTimer";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { SthElse } from "./SthElse";
import { BreakTimerWidget } from "./BreakTimerWidget";
import PomodoroContainer from "../dashboard/pomodoro/PomodoroContainer";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { SessionTimerWidget } from "./SessionTimerWidget";

interface Props {
  // totalSeconds: number;
  userId: string;
  isRunning: boolean;
  startTimeStamp: Date;
  focusAreas: FocusArea[];
  // timeSpentOfFA: FocusAreTotalsById[];
  todos: Todo[];
  groups: Group[];
  pomodoroSettings: PomodoroSettings;
}

const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

const socket = io(baseUrl);

export const SimpleTimerContainer = ({
  // totalSeconds,
  userId,
  isRunning,
  startTimeStamp,
  focusAreas,
  // timeSpentOfFA: focusAreaTotals,
  todos,
  groups,
  pomodoroSettings,
}: Props) => {
  const today = normalizeToStartOfDay(new Date());
  const [date, setDate] = useState<Date>(today);
  const [open, setOpen] = useState(false);
  const isToday = date.getTime() === today.getTime();

  const { data: totalSeconds = 0 } = useQuery({
    queryKey: ["totalSeconds", userId, date],
    queryFn: () =>
      axios
        .get(
          `/api/simple_timer/day?userId=${userId}&date=${date.toISOString()}`
        )
        .then((res) => res.data),
  });

  const { data: focusAreaTotals = 0} = useQuery({
    queryKey: ["focusAreaTotals", userId, date],
    queryFn: () =>
      axios
        .get(
          `/api/focus_area/day/totals?userId=${userId}&date=${date.toISOString()}`
        )
        .then((res) => res.data),
  });
  const [timeSpent, setTimeSpent] = useState(totalSeconds);
  const [time, setTime] = useState(timeSpent);
  const running = useRunningStore((s) => s.running);
  const setRunning = useRunningStore((s) => s.setRunning);
  const [startTime, setStartTime] = useState<number | null>(
    isRunning && startTimeStamp ? new Date(startTimeStamp).getTime() : null
  );
  const baselineRef = useRef<number>(timeSpent);
  // const [currentSessionTime, setCurrentSessionTime] = useState<number>(0);
  const [isPomodoro] = useState(false);

  const triggerStop = useRunningStore((state) => state.triggerStop);

  function formatHMS(total: number) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (totalSeconds && typeof totalSeconds === "number") {
      setTime(totalSeconds);
      baselineRef.current = totalSeconds;
    }
  }, [totalSeconds]);

  useEffect(() => {
    setRunning(isRunning);
  }, [isRunning, setRunning]);

  useEffect(() => {
    if (!running || startTime === null) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const newTime = baselineRef.current + elapsed;
      if (newTime > time) {
        setTime(newTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [running, startTime, time]);


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const el = glowRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
    };

    const el = glowRef.current;
    if (el) {
      el.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      if (el) {
        el.removeEventListener("mousemove", handleMouseMove);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      baselineRef.current = totalSeconds;
      const elapsed = Math.floor(
        (Date.now() - new Date(startTimeStamp).getTime()) / 1000
      );
      setTime(totalSeconds + elapsed);
      setStartTime(new Date(startTimeStamp).getTime());
    } else {
      setTime(totalSeconds);
    }
  }, [isRunning, totalSeconds, startTimeStamp]);

  useEffect(() => {
    if (running) {
      const tickInterval = setInterval(() => {
        socket?.emit("tick", { userId, totalSeconds: time });
      }, 1000);
      return () => clearInterval(tickInterval);
    }
  }, [running, time, userId]);

  const handleStart = () => {
    // capture wherever we’re at as the new baseline
    const now = Date.now();
    baselineRef.current = time;
    // reset the startTime to now
    setStartTime(now);
    setRunning(true);
    socket?.emit("start-timer", { userId, startTime: now });

    // setCurrentSessionTime(0);
  };

  const handleStop = () => {
    setRunning(false);
    setTimeSpent(time);
    baselineRef.current = time;
    // mutate();
    socket?.emit("stop-timer", { userId, totalSeconds: time });
    stop();
  };

  const changeDateBy = (days: number) => {
    setDate((prev) => {
      const newDate = new Date(prev.getTime());
      newDate.setDate(newDate.getDate() + days);
      const normalized = normalizeToStartOfDay(newDate);
      return normalized > today ? today : normalized;
    });
  };

  return (
    <div className="w-full overflow-x-hidden">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-4 bg-gradient-to-br from-sky-800/40 via-purple-800/30 to-indigo-800/40 backdrop-blur-sm">
        <section className="flex flex-col items-center gap-6 w-full">
          <div className="w-full max-w-xl">
                {!running && (
            <AnimatePresence mode="wait">
              <motion.div
                key={date.toISOString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                  <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => changeDateBy(-1)}>
                      <ChevronLeft className="w-6 h-6 text-white/70" />
                    </Button>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button className="w-52 text-lg font-bold bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm shadow-md rounded-xl">
                          {date.toLocaleDateString()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          captionLayout="dropdown"
                          onSelect={(d) => d && (setDate(d), setOpen(false))}
                          toDate={today}
                        />
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" onClick={() => changeDateBy(1)}>
                      <ChevronRight className="w-6 h-6 text-white/70" />
                    </Button>
                  </div>
              </motion.div>
            </AnimatePresence>
                )}
            <div className="bg-gradient-to-r from-cyan-500/40 via-sky-500/30 to-indigo-600/40 p-6 rounded-2xl shadow-xl border border-white/20 backdrop-blur-md hover:shadow-2xl transition-all duration-300">
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{
                  background: `radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.25), transparent 40%)`,
                }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={date.toISOString()}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    ref={glowRef}
                    className={`relative mt-6 w-full sm:w-auto max-w-full sm:min-w-[40rem] bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 backdrop-blur-md text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform duration-300 gap-2 py-2 ${
                      isPomodoro && "hidden"
                    }`}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl z-0"
                      style={{
                        background:
                          "radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.35), transparent 50%)",
                      }}
                    />
                    <CardHeader className="justify-center items-center">
                      <CardTitle className="text-7xl sm:text-9xl">
                        {formatHMS(time)}
                      </CardTitle>
                      {/* <CardDescription className="text-lg sm:text-2xl mt-6 text-center"></CardDescription> */}
                    </CardHeader>
                    <CardContent className="flex justify-center items-center min-h-[1rem]">
                      <AnimatePresence>
                        {running && (
                          <motion.div
                            key="stop-button"
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Button
                              className="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl"
                              onClick={triggerStop}
                            >
                              Stop
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>

                    <Link href={"timer/edit"}>
                      <motion.div
                        initial={{ scale: 1 }}
                        whileHover={{
                          textShadow: "0px 0px 8px rgba(79, 70, 229, 0.8)",
                        }}
                        className="flex justify-end sticky bottom-0 right-2 text-purple-200 hover:text-purple-600"
                      >
                        <Pencil className="mr-2" />
                      </motion.div>
                    </Link>
                    {running && (
                      <SessionTimerWidget />
                    )}
                    <span className="font-mono">
                      <BreakTimerWidget />
                    </span>
                  </Card>
                </motion.div>
              </AnimatePresence>
              <div className={`${!isPomodoro && "hidden"}`}>
                <PomodoroContainer pomodoroSettings={pomodoroSettings} />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={date.toISOString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col gap-4 w-full max-w-xl">
                <FocusAreaContainer
                  focusAreas={focusAreas}
                  timeSpent={focusAreaTotals || []}
                  handleStart={handleStart}
                  handleStop={handleStop}
                  setStartTime={setStartTime}
                  setIsRunning={setRunning}
                  setTime={setTime}
                  isRunning={running}
                  todos={todos}
                  isToday={isToday}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
        <aside className="w-full">
          <div className="p-4 h-full">
            <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 h-full">
              <SthElse groups={groups} userId={userId} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
