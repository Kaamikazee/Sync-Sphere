"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentBlock } from "./SegmentBlock";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { SegmentTypes } from "@/lib/api";
import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";

interface Props {
  userId: string;
}

export function Edit({ userId }: Props) {
  const today = normalizeToStartOfDayIST(new Date());
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(today);

  const glowRef = React.useRef<HTMLDivElement>(null);

  const {
    data: segments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["getSegments", userId, date],
    queryFn: () =>
      axios
        .get(`/api/segments/get?userId=${userId}&date=${date}`)
        .then((res) => res.data),
  });

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
      const newDate = new Date((prev ?? today).getTime());
      newDate.setDate(newDate.getDate() + days);
      return normalizeToStartOfDayIST(newDate);
    });
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
        Something went wrong: {error.message}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-4 py-8 bg-gradient-to-br from-indigo-950 via-purple-900 to-sky-900 text-white flex flex-col items-center gap-6 font-[\'Orbitron\'],sans">
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
              {date ? date.toLocaleDateString() : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={(date) => {
                setDate(date);
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
      <Card className="w-full max-w-2xl bg-white/10 backdrop-blur-lg border border-white/10 shadow-lg rounded-xl">
        <CardContent className="p-4 space-y-4">
          <AnimatePresence mode="wait">
            {segments.map((seg: SegmentTypes) => (
              <motion.div
                key={seg.id + date?.toISOString()}
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
                  type={seg.type}
                  label={seg.label!}
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
