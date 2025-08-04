"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { useRunningStore } from "@/stores/useGlobalTimer";
import FocusAreaContainer from "../focusAreaContainer/FocusAreaContainer";
import { SthElse } from "./SthElse";
import { BreakTimerWidget } from "./BreakTimerWidget";
import PomodoroContainer from "../dashboard/pomodoro/PomodoroContainer";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';
const socket = io(baseUrl);

export const DatePaginatedTimer = ({ userId }: { userId: string }) => {
  const today = normalizeToStartOfDay(new Date());
  const [date, setDate] = useState<Date>(today);
  const [open, setOpen] = useState(false);

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["timerData", userId, date],
    queryFn: () =>
      axios
        .get(`/api/timer/data?userId=${userId}&date=${date.toISOString()}`)
        .then((res) => res.data),
  });

  const {
    totalSeconds = 0,
    isRunning = false,
    startTimeStamp,
    focusAreas = [],
    timeSpentOfFA = [],
    todos = [],
    groups = [],
    pomodoroSettings,
  } = data || {};

  const [time, setTime] = useState(totalSeconds);
  const running = useRunningStore((s) => s.running);
  const setRunning = useRunningStore((s) => s.setRunning);
  const [startTime, setStartTime] = useState<number | null>(
    isRunning && startTimeStamp ? new Date(startTimeStamp).getTime() : null
  );
  const [currentSessionTime, setCurrentSessionTime] = useState<number>(0);
  const [isPomodoro] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);
  const baselineRef = useRef<number>(totalSeconds);

  const triggerStop = useRunningStore((s) => s.triggerStop);

  const formatHMS = (total: number) => {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  };

  function changeDateBy(days: number) {
    setDate((prev) => {
      const newDate = new Date((prev ?? today).getTime());
      newDate.setDate(newDate.getDate() + days);
      return normalizeToStartOfDay(newDate);
    });
  }

  useEffect(() => {
    setRunning(isRunning);
  }, [isRunning, setRunning]);

  useEffect(() => {
    if (!running || startTime === null) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTime(baselineRef.current + elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [running, startTime]);

  useEffect(() => {
    if (running) {
      const tickInterval = setInterval(() => {
        socket?.emit("tick", { userId, totalSeconds: time });
        setCurrentSessionTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(tickInterval);
    } else {
      setCurrentSessionTime(0);
    }
  }, [running, time, userId]);

  useEffect(() => {
    if (isRunning && startTimeStamp) {
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

  const handleStart = () => {
    const now = Date.now();
    baselineRef.current = time;
    setStartTime(now);
    setRunning(true);
    socket?.emit("start-timer", { userId, startTime: now });
    setCurrentSessionTime(0);
  };

  const handleStop = () => {
    setRunning(false);
    baselineRef.current = time;
    socket?.emit("stop-timer", { userId, totalSeconds: time });
    triggerStop();
  };

  if (isLoading) {
    return <div className="text-center py-10 text-white/70 italic animate-pulse">Loading timer...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-400 italic">Something went wrong: {error.message}</div>;
  }

  return (
    <div className="p-4 flex flex-col items-center">
      {/* Date Navigation */}
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

      {/* Timer Card */}
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
            className="relative bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 text-white rounded-2xl shadow-xl hover:shadow-2xl p-6 w-full max-w-2xl"
          >
            <CardHeader className="items-center">
              <CardTitle className="text-7xl sm:text-8xl">
                {formatHMS(time)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center mt-4">
              <AnimatePresence>
                {running && (
                  <motion.div
                    key="stop"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button className="bg-red-600 hover:bg-red-700" onClick={handleStop}>
                      Stop
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              {!running && (
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleStart}>
                  Start
                </Button>
              )}
            </CardContent>
            {running && (
              <div className="absolute top-2 right-4 text-xs bg-black/30 px-2 py-1 rounded-md shadow-sm">
                ⏱️ Focused for {formatHMS(currentSessionTime)}
              </div>
            )}
            <div className="mt-4">
              <BreakTimerWidget />
            </div>
            <Link href="/timer/edit">
              <div className="absolute bottom-2 right-4 text-white/80 hover:text-white">
                <Pencil />
              </div>
            </Link>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Focus Areas and Sidebar */}
      <div className="mt-6 w-full max-w-4xl">
        <FocusAreaContainer
          focusAreas={focusAreas}
          timeSpent={timeSpentOfFA}
          handleStart={handleStart}
          handleStop={handleStop}
          setStartTime={setStartTime}
          setIsRunning={setRunning}
          setTime={setTime}
          isRunning={running}
          todos={todos}
        />
      </div>

      <div className="mt-6 w-full max-w-4xl">
        <SthElse groups={groups} userId={userId} />
      </div>

      {isPomodoro && (
        <div className="mt-6 w-full max-w-4xl">
          <PomodoroContainer pomodoroSettings={pomodoroSettings} />
        </div>
      )}
    </div>
  );
};
