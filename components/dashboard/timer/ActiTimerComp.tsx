"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Activity } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Edit, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

interface Props {
  activity: Activity;
  onUpdate: (newTime: number, id: string) => void;
}

let socket: Socket | null = null;

function useSocket() {
  useEffect(() => {
    if (!socket) {
      socket = io("http://localhost:5555");
    }
  }, []);
}

export function ActiTimerComp({
  activity: { name, timeSpent: OldTimeSpent, id }, onUpdate: onUpdates
}: Props) {
  useSocket();

  const [timeSpent, setTimeSpent] = useState(OldTimeSpent);
  const [time, setTime] = useState(timeSpent);
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  // baselineRef will hold the activity's timeSpent at the moment the timer is started.
  const baselineRef = useRef<number>(timeSpent);

  const onUpdate = useCallback((newTime: number, id: string) => {
    setTimeSpent(newTime);
  }, []);

  useEffect(() => {
    const handleStart = (data: {
      activityId: string;
      startTime: number;
      baseline: number;
    }) => {
      if (data.activityId !== id) return;
      baselineRef.current = data.baseline;
      setTime(data.baseline);
      setStartTime(data.startTime);
      setRunning(true);
    };
    socket.on("activityStarted", handleStart);
    return () => {
      socket.off("activityStarted", handleStart);
    };
  }, [id]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const newTime = baselineRef.current + elapsed;
      setTime(newTime);
      onUpdate(newTime, id);
      onUpdates(newTime, id); 
      // Broadcast this tick (only one client needs to—but it's simplest if all do)
      socket.emit("updateTimer", { activityId: id, elapsedTime: newTime });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, startTime, id, onUpdate, onUpdates]);

  useEffect(() => {
    const handleTick = (data: { activityId: string; elapsedTime: number }) => {
      if (data.activityId !== id) return;
      setTime(data.elapsedTime);
      onUpdate(data.elapsedTime, id);
    };
    socket.on("timerUpdated", handleTick);
    return () => {
      socket.off("timerUpdated", handleTick);
    };
  }, [id, onUpdate]);

  // 4) Listen for remote stops
  useEffect(() => {
    const handleStop = (data: { activityId: string; elapsedTime: number }) => {
      if (data.activityId !== id) return;
      setRunning(false);
      setTime(data.elapsedTime);
      onUpdate(data.elapsedTime, id);
    };
    socket.on("activityStopped", handleStop);
    return () => {
      socket.off("activityStopped", handleStop);
    };
  }, [id, onUpdate]);

  const handleStart = () => {
    baselineRef.current = timeSpent;
    const now = Date.now();
    setStartTime(now);
    setRunning(true);
    socket.emit("startActivity", {
      activityId: id,
      startTime: now,
      baseline: timeSpent,
    });
  };


  const {mutate, isPending} = useMutation({
    mutationFn: async () => {
        await axios.post("/api/activity", {
            activityName: name,
            timeSpent
        })
    },
    onSuccess: () => {
        toast.success(`Time spent of ${name} is updated successfully`)
    },
    onError: () => {
        toast.error(`${name}'s Time spent updation was unsuccessful, Please Retry.`)
    }
  })

  const handleStop = () => {
    setRunning(false);
    socket.emit("stopActivity", { activityId: id, elapsedTime: time });
    onUpdate(time, id);
    mutate()
  };

  function formatHMS(total: number) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  return (
    <div className="flex items-center justify-between">
      <div className="bg-cyan-400 rounded-4xl mr-5 p-2">
        {!running ? (
          <PlayCircle
            onClick={handleStart}
            className="cursor-pointer hover:text-black/40"
            size={30}
          />
        ) : (
          <PauseCircle
            onClick={handleStop}
            className="cursor-pointer hover:text-black/40"
            size={30}
          />
        )}
      </div>
      <Accordion
        type="single"
        collapsible
        className="w-2xl"
        defaultValue="item-2"
      >
        <AccordionItem value="item-1" className="bg-cyan-400 rounded-4xl px-5">
          <AccordionTrigger className="">
            <span className="w-[15%]">{name}</span>{" "}
            <span className="font-bold">{formatHMS(timeSpent)}</span>
          </AccordionTrigger>
          <AccordionContent className="gap-4 text-balance">
            <p>Somemdk</p>
            <p>sjdk</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="bg-cyan-400 rounded-4xl ml-5 p-2">
        <Edit className="cursor-pointer hover:text-black/40" size={30} />
      </div>
      <div className="bg-cyan-400 rounded-4xl ml-2 p-2">
        <Trash2 className="cursor-pointer hover:text-black/40" size={30} />
      </div>
    </div>
  );
}
