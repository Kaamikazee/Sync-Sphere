"use client";

import { CreateTodo } from "@/components/todo/CreateTodo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Activity, Todo } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Edit, PauseCircle, PlayCircle, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { motion } from "framer-motion"
import { UpdateTodo } from "@/components/todo/UpdateTodo";


const iconVariants = {
  hover: { scale: 1.2, rotate: 10 },
  tap:   { scale: 0.9, rotate: -10 }
}

interface Props {
  activity: Activity;
  onUpdate: (newTime: number, id: string) => void;
  todos: Todo[];
}

let socket: Socket | null = null;

function useSocket() {
  useEffect(() => {
    if (!socket) {
      socket = io("http://localhost:3001");
    }
  }, []);
}

export function ActiTimerComp({
  activity: { name, timeSpent: OldTimeSpent, id },
  onUpdate: onUpdates,
  todos,
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
    if (!socket) return;
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
    socket?.on("activityStarted", handleStart);
    return () => {
      socket?.off("activityStarted", handleStart);
    };
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    if (!running) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime!) / 1000);
      const newTime = baselineRef.current + elapsed;
      setTime(newTime);
      onUpdate(newTime, id);
      onUpdates(newTime, id);
      // Broadcast this tick (only one client needs to—but it's simplest if all do)
      socket?.emit("updateTimer", { activityId: id, elapsedTime: newTime });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, startTime, id, onUpdate, onUpdates]);

  useEffect(() => {
    if (!socket) return;
    const handleTick = (data: { activityId: string; elapsedTime: number }) => {
      if (data.activityId !== id) return;
      setTime(data.elapsedTime);
      onUpdate(data.elapsedTime, id);
    };
    socket?.on("timerUpdated", handleTick);
    return () => {
      socket?.off("timerUpdated", handleTick);
    };
  }, [id, onUpdate]);

  // 4) Listen for remote stops
  useEffect(() => {
    if (!socket) return;
    const handleStop = (data: { activityId: string; elapsedTime: number }) => {
      if (data.activityId !== id) return;
      setRunning(false);
      setTime(data.elapsedTime);
      onUpdate(data.elapsedTime, id);
    };
    socket?.on("activityStopped", handleStop);
    return () => {
      socket?.off("activityStopped", handleStop);
    };
  }, [id, onUpdate]);

  const handleStart = () => {
    if (!socket) return;
    baselineRef.current = timeSpent;
    const now = Date.now();
    setStartTime(now);
    setRunning(true);
    socket?.emit("startActivity", {
      activityId: id,
      startTime: now,
      baseline: timeSpent,
    });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await axios.post("/api/activity", {
        activityName: name,
        timeSpent,
      });
    },
    onSuccess: () => {
      toast.success(`Time spent of ${name} is updated successfully`);
    },
    onError: () => {
      toast.error(
        `${name}'s Time spent updation was unsuccessful, Please Retry.`
      );
    },
  });

  const handleStop = () => {
    if (!socket) return;
    setRunning(false);
    socket?.emit("stopActivity", { activityId: id, elapsedTime: time });
    onUpdate(time, id);
    mutate();
  };

  function formatHMS(total: number) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }


  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10">
    {/* Play / Pause Button */}
    <motion.div
      className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-400 text-white shadow-lg rounded-full p-2"
      whileHover="hover"
      whileTap="tap"
      variants={iconVariants}
    >
      {!running ? (
        <PlayCircle
          onClick={handleStart}
          className="cursor-pointer"
          size={30}
        />
      ) : (
        <PauseCircle
          onClick={handleStop}
          className="cursor-pointer"
          size={30}
        />
      )}
    </motion.div>

    {/* Accordion */}
    <Accordion
      type="single"
      collapsible
      className="flex-1 min-w-[300px] max-w-3xl"
      defaultValue="item-2"
    >
      <AccordionItem
        value="item-1"
        className="bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 text-white shadow-lg rounded-2xl px-6 py-2 hover:shadow-2xl hover:scale-[1.01] transition-transform duration-300"
      >
        <AccordionTrigger className="cursor-pointer flex justify-between items-center w-full text-lg font-medium">
          <span className="truncate w-[40%]">{name}</span>
          <span className="font-bold">{formatHMS(timeSpent)}</span>
        </AccordionTrigger>

        <AccordionContent className="bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 text-gray-900 font-semibold py-4 px-5 rounded-xl shadow-inner mt-3">
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl py-2 px-3 shadow-md mb-4">
            {todos.length > 0 ? (
              todos.map((t) => (
                <div
                  key={t.id}
                  className="text-white text-base font-medium mb-2 flex items-center"
                >
                  <motion.span
                    className="flex items-center gap-2 cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                  >
                    <UpdateTodo todo={t} />
                  </motion.span>
                </div>
              ))
            ) : (
              <h1 className="text-white text-lg font-semibold text-center">
                ― No Todos ―
              </h1>
            )}
          </div>

          <div className="flex justify-center items-center">
            <CreateTodo activityId={id} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    {/* Edit Button */}
    <motion.div
      className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-400 text-white shadow-lg rounded-full p-2"
      whileHover="hover"
      whileTap="tap"
      variants={iconVariants}
    >
      <Edit className="cursor-pointer" size={30} />
    </motion.div>

    {/* Delete Button */}
    <motion.div
      className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-400 text-white shadow-lg rounded-full p-2"
      whileHover="hover"
      whileTap="tap"
      variants={iconVariants}
    >
      <Trash2 className="cursor-pointer" size={30} />
    </motion.div>
  </div>


  );
}
