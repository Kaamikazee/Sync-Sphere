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
import { Edit, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UpdateTodo } from "@/components/todo/UpdateTodo";

const iconVariants = {
  hover: { scale: 1.2, rotate: 10 },
  tap: { scale: 0.9, rotate: -10 },
};

interface Props {
  focusArea: FocusArea;
  todos: Todo[];
  timeSpent: number;
  isRunning: boolean;
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
  timeSpent: OldTimeSpent,
  isRunning,
  todos,
  handleStart,
  handleStop,
  setIsRunning,
  setStartTime,
  setTime,
  isActive,
  onActivate,
}: Props) {
  const [timeSpent] = useState(OldTimeSpent);
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [running, setRunning] = useState(isRunning);
  const [IsFocusRunning, setIsFocusRunning] = useState(false);
  const [displayTime, setDisplayTime] = useState(timeSpent);

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
      const { data } = await axios.post("/api/simple_timer/start", {
        focusAreaId,
      });
      return data;
    },
    onSuccess: (data) => {
      setSegmentId(data.segmentId); // Save the segmentId
      localStorage.setItem("activeSegmentId", data.segmentId);
      localStorage.setItem("activeStartTime", data.start);
    },
  });

  const onStart = () => {
    setRunning(true);
    handleStart();
    start();
    onActivate();
    localStorage.setItem("activeFocusAreaId", focusAreaId);
    setIsFocusRunning(isActive);
  };

  const { mutate: stop } = useMutation({
    mutationFn: async () => {
      if (!segmentId) throw new Error("No segmentId available");
      await axios.post("/api/simple_timer/stop", {
        segmentId,
      });
    },
  });

  const onStop = () => {
    setRunning(false);
    handleStop();
    stop();
    setIsFocusRunning(false);
    // setIsRunning(false)

    localStorage.removeItem("activeSegmentId");
    localStorage.removeItem("activeStartTime");
    localStorage.removeItem("activeSegmentId");
    localStorage.removeItem("activeDisplayTime");
    localStorage.removeItem("activeFocusAreaId");
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
          <PlayCircle onClick={onStart} className="cursor-pointer" size={30} />
        ) : (
          <PauseCircle onClick={onStop} className="cursor-pointer" size={30} />
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
            <span className="font-bold">{formatHMS(displayTime)}</span>
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
              <CreateTodo focusAreaId={focusAreaId} />
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
