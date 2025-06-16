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
import { io, Socket } from "socket.io-client";

interface Props {
  totalSeconds: number;
  userId: string
}


const socket = io("http://localhost:3001");

export const SimpleTimerContainer = ({ totalSeconds, userId }: Props) => {
  
  const [timeSpent, setTimeSpent] = useState(totalSeconds);
  const [time, setTime] = useState(timeSpent);
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const baselineRef = useRef<number>(timeSpent);

  function formatHMS(total: number) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  useEffect(() => {
    if (!running || startTime === null) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const newTime = baselineRef.current + elapsed;
      setTime(newTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [running, startTime]);


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
    const now = Date.now()
    baselineRef.current = time;
    // reset the startTime to now
    setStartTime(now);
    setRunning(true);
    socket?.emit("start-timer", { userId, startTime: now });
  };


  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
        await axios.post("/api/simple_timer/update", {
            totalSeconds: time
        })
    }
  })

  const handleStop = () => {
    setRunning(false);
    setTimeSpent(time);
    //   baselineRef.current = time;
    mutate()
    socket?.emit("stop-timer", { userId, totalSeconds: time });
  };

  return (
    <Card className="mt-6 w-full sm:w-auto sm:min-w-[40rem] py-10 bg-cyan-400">
      <CardHeader className="justify-center items-center">
        <CardTitle className="text-7xl sm:text-9xl">
          {formatHMS(time)}
        </CardTitle>
        <CardDescription className="text-lg sm:text-2xl mt-6 text-center"></CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center items-center mt-4 gap-4">
        {running ? (
          <Button className="cursor-pointer" disabled={isPending} onClick={handleStop} > Stop </Button>
        ) : (
          <Button className="cursor-pointer" disabled={isPending}
            onClick={handleStart}
          >
            Start
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
