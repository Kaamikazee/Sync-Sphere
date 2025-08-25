"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useEffect, useRef, useState } from "react";
import FocusAreaContainer from "../focusAreaContainer/FocusAreaContainer";
import { FocusArea, PomodoroSettings } from "@prisma/client";
import Link from "next/link";
import { Button } from "../ui/button";
import { useRunningStore } from "@/stores/useGlobalTimer";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { SthElse } from "./SthElse";
import { BreakTimerWidget } from "./BreakTimerWidget";
import PomodoroContainer from "../dashboard/pomodoro/PomodoroContainer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { SessionTimerWidget } from "./SessionTimerWidget";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { getSocket } from "@/lib/socket";
import { groupsWithUserNameAndRole } from "@/lib/api";
// import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";

interface Props {
  // totalSeconds: number;
  userId: string;
  userName: string;
  isRunning: boolean;
  startTimeStamp: Date;
  focusAreas: FocusArea[];
  // timeSpentOfFA: FocusAreTotalsById[];
  // todos: Todo[];
  groups: groupsWithUserNameAndRole[];
  pomodoroSettings: PomodoroSettings;
}

const FocusAreaContainerMemo = React.memo(FocusAreaContainer);
const SthElseMemo = React.memo(SthElse);

export const SimpleTimerContainer = ({
  userId,
  isRunning,
  startTimeStamp,
  focusAreas,
  // todos,
  groups,
  pomodoroSettings,
  userName
}: Props) => {
  const socket = getSocket();
  const today = normalizeToStartOfDay(new Date());
  const [date, setDate] = useState<Date>(today);
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const isToday = date.getTime() === today.getTime();
  const queryClient = useQueryClient();

  function formatUserDate(date: Date) {
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const { data: totalSeconds = 0 } = useQuery({
    queryKey: ["totalSeconds", userId, date],
    queryFn: () =>
      axios
        .get(
          `/api/simple_timer/day?userId=${userId}&date=${normalizeToStartOfDay(
            date
          ).toISOString()}
`
        )
        .then((res) => res.data),
  });

  const { data: focusAreaTotals = 0 } = useQuery({
    queryKey: ["focusAreaTotals", userId, date],
    queryFn: () =>
      axios
        .get(
          `/api/focus_area/day/totals?userId=${userId}&date=${normalizeToStartOfDay(
            date
          ).toISOString()}
`
        )
        .then((res) => res.data),
  });

  const { data: todos = [] } = useQuery({
    queryKey: ["todos", userId, date],
    queryFn: () =>
      axios
        .get(
          `/api/todos/day?userId=${userId}&date=${normalizeToStartOfDay(
            date
          ).toISOString()}
`
        )
        .then((res) => res.data),
  });

  const [timeSpent, setTimeSpent] = useState(totalSeconds);
  const running = useRunningStore((s) => s.running);
  const setActiveFocusAreaId = useRunningStore((s) => s.setActiveFocusAreaId);
  const setRunning = useRunningStore((s) => s.setRunning);
  const [startTime, setStartTime] = useState<number | null>(
    isRunning && startTimeStamp ? new Date(startTimeStamp).getTime() : null
  );
  const baselineRef = useRef<number>(timeSpent);
  const [time, setTime] = useState(timeSpent);
  const timeRef = useRef<number>(time);
  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  const [isPomodoro] = useState(false);

  const triggerStop = useRunningStore((state) => state.triggerStop);

  function formatHMS(total: number) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  const glowRef = useRef<HTMLDivElement>(null);

  const changeDateBy = (days: number) => {
    setDate((prev) => {
      const newDate = new Date(prev.getTime());
      newDate.setDate(newDate.getDate() + days);
      const normalized = normalizeToStartOfDay(newDate);
      return normalized > today ? today : normalized;
    });
  };

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

  const updateTime = () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    setTime(baselineRef.current + elapsed);
  };

  updateTime(); // 🔹 update immediately on start
  const interval = setInterval(updateTime, 1000);

  return () => clearInterval(interval);
}, [running, startTime]);


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

  // Join room and reconcile updates from server
useEffect(() => {
  if (!socket || !userId) return;

  // join the user room
  socket.emit("joinUserRoom", { userId });

  const onUpdate = (payload: {
  isRunning: boolean;
  activeFocusAreaId: string | null;
  totalSeconds: number | null;
  startTime: number | null;
}) => {
  useRunningStore.getState().setRunning(payload.isRunning);
  useRunningStore.getState().setActiveFocusAreaId(payload.activeFocusAreaId);

  // Only overwrite time when server provides an authoritative numeric value
  if (typeof payload.totalSeconds === "number" && !Number.isNaN(payload.totalSeconds)) {
    baselineRef.current = payload.totalSeconds;
    setTime(payload.totalSeconds);
  } else if (payload.startTime) {
    // server told us the timer started; set startTime but keep the current baseline/time
    setStartTime(payload.startTime);
    // ensure baselineRef is in sync with the currently-displayed time so the interval will add correctly
    baselineRef.current = timeRef.current;
  }

  // if server explicitly cleared startTime (stop), reflect that
  if (!payload.isRunning) {
    setStartTime(null);
  }
};


  socket.on("timer:updated", onUpdate);
  return () => {
    socket.off("timer:updated", onUpdate);
  };
}, [socket, userId]);


   useEffect(() => {
    if (!socket || !userId) return;
    if (!running) return;

    const tick = () => {
      // send latest value from ref
      socket.emit("tick", { userId, currentTotalSeconds: timeRef.current });
    };

    // send immediately then every second
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [socket, userId, running]); // no `time` in deps — we use timeRef
  

  const handleStart = (focusId?: string) => {
    const now = Date.now();
    baselineRef.current = timeRef.current;
    setStartTime(now);
    setTime(baselineRef.current);
    setRunning(true);
    setActiveFocusAreaId(focusId ?? null);
    setTime(baselineRef.current + Math.floor((Date.now() - now) / 1000));


    // emit focusId to socket
    socket?.emit("start-timer", {
      userId,
      startTime: now,
      focusAreaId: focusId,
    });

    // optimistic store update
    useRunningStore.getState().setRunning(true, true);
    useRunningStore.getState().setActiveFocusAreaId(focusId ?? null);

    queryClient.invalidateQueries({ queryKey: ["totalSeconds", userId, date] });
    queryClient.invalidateQueries({
      queryKey: ["focusAreaTotals", userId, date],
    });
  };

  const handleStop = () => {
    setRunning(false);
    setActiveFocusAreaId(null);
    setTimeSpent(timeRef.current);
    baselineRef.current = timeRef.current;

    socket?.emit("stop-timer", { userId, totalSeconds: timeRef.current });

    // optimistic store update
    useRunningStore.getState().setRunning(false);
    useRunningStore.getState().setActiveFocusAreaId(null);

    queryClient.invalidateQueries({ queryKey: ["totalSeconds", userId, date] });
    queryClient.invalidateQueries({
      queryKey: ["focusAreaTotals", userId, date],
    });
  };

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

  return (
    <div className="w-full overflow-x-hidden">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-4 bg-slate-800 sm:bg-gradient-to-br sm:from-sky-700 sm:via-purple-700 sm:to-indigo-700 sm:backdrop-blur-sm">
        <section className="flex flex-col items-center gap-6 w-full">
          <div className="w-full max-w-xl">
            {!running && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={date.getTime()}
                  initial={reduce ? undefined : { opacity: 0, y: 10 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <Button
                      data-ripple
                      variant="ghost"
                      onClick={() => changeDateBy(-1)}
                    >
                      <ChevronLeft className="w-6 h-6 text-white/70" />
                    </Button>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger data-ripple asChild>
                        <Button className="w-52 text-lg font-bold bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm shadow-md rounded-xl">
                          {formatUserDate(date)}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={normalizeToStartOfDay(date)}
                          captionLayout="dropdown"
                          onSelect={(d) => {
                            if (!d) return;
                            setDate(normalizeToStartOfDay(d)); // <== normalize properly here
                            setOpen(false);
                          }}
                          toDate={today}
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      data-ripple
                      variant="ghost"
                      onClick={() => changeDateBy(1)}
                    >
                      <ChevronRight className="w-6 h-6 text-white/70" />
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
            <div
              className="relative bg-slate-800 p-3 rounded-xl shadow-sm
               sm:bg-gradient-to-r sm:from-cyan-500/40 sm:via-sky-500/30 sm:to-indigo-600/40 sm:p-6 sm:rounded-2xl sm:shadow-xl sm:border sm:border-white/20 sm:backdrop-blur-md transition-all duration-300"
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), transparent 60%)",
                }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={date.getTime()}
                  initial={reduce ? undefined : { opacity: 0, y: 10 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    ref={glowRef}
                    className={`relative mt-6 w-full sm:w-auto max-w-full sm:min-w-[40rem] bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 backdrop-blur-md text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform duration-300 gap-2 py-2 ${
                      isPomodoro && "hidden"
                    }`}
                    style={{
                      willChange: "transform, opacity",
                      transform: "translateZ(0)",
                      backfaceVisibility: "hidden",
                    }}
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
                              data-ripple
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
                    {running && <SessionTimerWidget />}
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
              key={date.getTime()}
              initial={reduce ? undefined : { opacity: 0, y: 10 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col gap-4 w-full max-w-xl">
                <FocusAreaContainerMemo
                  focusAreas={focusAreas}
                  timeSpent={focusAreaTotals || []}
                  handleStart={(focusId: string) => handleStart(focusId)}
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
            <div className="relative sm:bg-white/10 sm:border sm:border-white/20 sm:backdrop-blur-md shadow-sm sm:rounded-2xl sm:shadow-lg sm:p-6 p-3 sm:hover:shadow-2xl transition-all duration-300">
              <SthElseMemo groups={groups} userId={userId} userName={userName}/>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};