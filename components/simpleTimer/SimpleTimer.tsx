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
  userId: string;
  isRunning: boolean;
  startTimeStamp: Date;
}


const socket = io("http://localhost:3001");

export const SimpleTimerContainer = ({ totalSeconds, userId, isRunning, startTimeStamp }: Props) => {
  
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

const {mutate: start} = useMutation({
    mutationFn: async () => {
        await axios.post("/api/simple_timer/start")
    }
  })


  const handleStart = () => {
    // capture wherever we’re at as the new baseline
    const now = Date.now()
    baselineRef.current = time;
    // reset the startTime to now
    setStartTime(now);
    setRunning(true);
    socket?.emit("start-timer", { userId, startTime: now });
    start()
  };


  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
        await axios.post("/api/simple_timer/update", {
            totalSeconds: time
        })
    }
  })

  const {mutate: stop} = useMutation({
    mutationFn: async () => {
        await axios.post("/api/simple_timer/stop")
    }
  })
  

  const handleStop = () => {
    setRunning(false);
    setTimeSpent(time);
    //   baselineRef.current = time;
    mutate()
    socket?.emit("stop-timer", { userId, totalSeconds: time });
    stop()
  };

  return (
  <Card className="mt-6 w-full sm:w-auto sm:min-w-[40rem] py-10 bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 backdrop-blur-md text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform duration-300">
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
);

};
