"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentBlock } from "./SegmentBlock";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { SegmentTypes } from "@/lib/api";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { formatHMS } from "../BreakTimerWidget"; // <-- added

interface Props {
  userId: string;
  focusAreaNamesAndIds: { id: string; name: string }[];
}

export function Edit({ userId, focusAreaNamesAndIds }: Props) {
  const today = normalizeToStartOfDay(new Date());
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date>(today);

  const glowRef = React.useRef<HTMLDivElement>(null);

  const {
    data: segments = [], // ✅ default to empty array so map never crashes
    isLoading,
    error,
  } = useQuery({
    queryKey: ["getSegments", userId, date.toISOString()],
    queryFn: () =>
      axios
        .get(`/api/segments/get`, {
          params: {
            userId,
            date: date.toISOString(),
          },
        })
        .then((res) => res.data),
  });

  // total focus-area time (exclude BREAK segments)
  const totalFocusSeconds = React.useMemo(() => {
    return (segments as SegmentTypes[])
      .filter((s) => s.type !== "BREAK")
      .reduce((acc, s) => acc + (s.duration ?? 0), 0);
  }, [segments]);

  // glow hover effect
  React.useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    const glowLayer = el.querySelector(
      ".glow-overlay"
    ) as HTMLDivElement | null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!glowLayer) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
    };

    const handleEnter = () => glowLayer && (glowLayer.style.opacity = "1");
    const handleLeave = () => glowLayer && (glowLayer.style.opacity = "0");

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseenter", handleEnter);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseenter", handleEnter);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  function changeDateBy(days: number) {
    setDate((prev) => {
      const newDate = new Date(prev.getTime());
      newDate.setDate(newDate.getDate() + days);
      return normalizeToStartOfDay(newDate);
    });
  }

  function handleDateSelect(selectedDate?: Date) {
    if (!selectedDate) return;
    const normalized = normalizeToStartOfDay(selectedDate);
    // ✅ Force new Date object to ensure query key changes even if same day
    setDate(new Date(normalized));
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[20vh] text-white/80 text-sm italic animate-pulse">
        Loading segments...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[20vh] text-red-300 text-sm italic">
        Something went wrong: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-4 py-8 bg-gradient-to-br from-indigo-950 via-purple-900 to-sky-900 text-white flex flex-col items-center gap-6 font-['Orbitron'],sans">
      {/* Date Picker */}
      <div className="flex gap-4 items-center">
        <Button
          variant="ghost"
          className="text-xl p-2 text-white/80 hover:text-white"
          onClick={() => changeDateBy(-1)}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date"
              className="w-52 text-lg font-bold bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm shadow-md rounded-xl transition-all duration-300"
            >
              {date.toLocaleDateString()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={(d) => {
                handleDateSelect(d);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          className="text-xl p-2 text-white/80 hover:text-white"
          onClick={() => changeDateBy(1)}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Timer Card */}
      <Card
        ref={glowRef}
        className="w-full max-w-2xl bg-white/10 backdrop-blur-lg border border-white/10 shadow-lg rounded-xl"
      >
        <CardContent className="p-4 space-y-4">
          {/* Total focus-area time for the day */}
          <div className="flex items-center justify-between px-2">
            <div className="text-sm text-white/80">Focus time (today)</div>
            <div className="text-lg font-mono font-bold">
              {formatHMS(totalFocusSeconds)}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/*
              --- NOTE: still slicing to skip the first block if you kept that behavior ---
            */}
            {segments.slice(1).map((seg: SegmentTypes) => (
              <motion.div
                key={seg.id + date.toISOString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="transition-transform duration-300 ease-out hover:scale-[1.02] hover:brightness-110"
              >
                <SegmentBlock
                  start={seg.start}
                  end={seg.end!}
                  duration={seg.duration!}
                  focusAreaName={seg.focusArea.name}
                  focusAreaNamesAndIds={focusAreaNamesAndIds}
                  type={seg.type}
                  label={seg.label!}
                  id={seg.id}
                  userId={userId}
                  showAddButton
                  showEditButton
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
