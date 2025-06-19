"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "../ui/button";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { io } from "socket.io-client";
import FocusAreaContainer from "../focusAreaContainer/FocusAreaContainer";
import { FocusArea, Group, Subscription, Todo } from "@prisma/client";
import { FocusAreTotalsById, GroupIdAndSubscribers } from "@/lib/api";
import { SthElse } from "../dashboard/timer/SthElse";

interface Props {
  totalSeconds: number;
  userId: string;
  isRunning: boolean;
  startTimeStamp: Date;
  focusAreas: FocusArea[];
  timeSpentOfFA: FocusAreTotalsById[];
  todos: Todo[];
  IdsAndSubscriber: GroupIdAndSubscribers[][],
  groups: Group[]
}

const socket = io("http://localhost:3001");

export const SimpleTimerContainer = ({
  totalSeconds,
  userId,
  isRunning,
  startTimeStamp,
  focusAreas,
  timeSpentOfFA: focusAreaTotals,
  todos,
  IdsAndSubscriber,
  groups
}: Props) => {
  const [timeSpent, setTimeSpent] = useState(totalSeconds);
  const [time, setTime] = useState(timeSpent);
  const [running, setRunning] = useState(isRunning);
  const [startTime, setStartTime] = useState<number | null>(
    isRunning && startTimeStamp ? new Date(startTimeStamp).getTime() : null
  );
  const baselineRef = useRef<number>(timeSpent);

  function formatHMS(total: number) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  const glowRef = useRef<HTMLDivElement>(null);

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
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await axios.post("/api/simple_timer/update", {
        totalSeconds: time,
      });
    },
  });

  const handleStop = () => {
    setRunning(false);
    setTimeSpent(time);
    baselineRef.current = time;
    mutate();
    socket?.emit("stop-timer", { userId, totalSeconds: time });
    stop();
  };

  console.log("FROM CONTAINER: ", IdsAndSubscriber);
  
  return (
    <>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-4 bg-gradient-to-br from-sky-800/40 via-purple-800/30 to-indigo-800/40 backdrop-blur-sm">
     
        <section className="flex flex-col items-center gap-6 w-full">
          <div className="w-full max-w-xl">
            <div className="bg-gradient-to-r from-cyan-500/40 via-sky-500/30 to-indigo-600/40 p-6 rounded-2xl shadow-xl border border-white/20 backdrop-blur-md hover:shadow-2xl transition-all duration-300">
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.25), transparent 40%)`,
          }}
        />

        <Card
        ref={glowRef}
          className="relative mt-6 w-full sm:w-auto sm:min-w-[40rem] py-10 bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 backdrop-blur-md text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform duration-300"
        >
          <div
    className="pointer-events-none absolute inset-0 rounded-2xl z-0"
    style={{
      background:
        "radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.35), transparent 50%)"
    }}
  />
          <CardHeader className="justify-center items-center">
            <CardTitle className="text-7xl sm:text-9xl">
              {formatHMS(time)}
            </CardTitle>
            <CardDescription className="text-lg sm:text-2xl mt-6 text-center"></CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center mt-4 gap-4">
            {running ? (
              <Button
                className="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl transition-all duration-200"
                disabled={isPending}
                onClick={handleStop}
              >
                Stop
              </Button>
            ) : (
              <Button
                className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl transition-all duration-200"
                disabled={isPending}
                onClick={handleStart}
              >
                Start
              </Button>
            )}
          </CardContent>
        </Card>
        </div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xl">
          {/* pass props through */}
          
          <FocusAreaContainer
            focusAreas={focusAreas}
            timeSpent={focusAreaTotals}
            handleStart={handleStart}
            handleStop={handleStop}
            setStartTime={setStartTime}
            setIsRunning={setRunning}
            setTime={setTime}
            isRunning={running}
            todos={todos}
          />
        </div>
        </section>
        <aside className="w-full">
            <div className="p-4 h-full">
              <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 h-full">
                <SthElse groups={groups} userId={userId} IdsAndSubscriber={IdsAndSubscriber} />
              </div>
            </div>
          </aside>
      </div>
    </>
  );
};
