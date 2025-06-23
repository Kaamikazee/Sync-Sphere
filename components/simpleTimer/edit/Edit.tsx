"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentTypes } from "@/lib/api";
import { SegmentBlock } from "./SegmentBlock";

interface Props {
  totalSeconds: number;
  segments: SegmentTypes[];
}

export function Edit({ totalSeconds, segments }: Props) {
    
  const today = normalizeToStartOfDay(new Date());
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(today);

  const glowRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
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

  function formatHMS(total: number) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  return (
    <>
      <div className="flex flex-col gap-3 justify-center items-center py-5 mt-2">
        {/* <Label htmlFor="date" className="px-1">
        Date of birth
        </Label> */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date"
              className="w-48 justify-center items-center font-normal border-0 outline-0 "
            >
              {date ? date.toLocaleDateString() : "Select date"}
              {/* <ChevronDownIcon /> */}
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
      </div>

      <Card
        ref={glowRef}
        className="sticky top-24 z-10 w-[20rem] bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 backdrop-blur-md text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-transform duration-300 mx-auto"
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl z-0"
          style={{
            background:
              "radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.35), transparent 50%)",
          }}
        />
        <CardHeader className="flex flex-col justify-center items-center">
          <CardTitle className="text-5xl sm:text-6xl text-center">
            {formatHMS(totalSeconds)}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardContent>
          {segments.map((seg) => {
            return (
              <div key={seg.id}>
                <SegmentBlock
                  start={seg.start}
                  end={seg.end!}
                  duration={seg.duration!}
                  focusAreaName={seg.focusArea.name}
                  type={seg.type}
                  label={seg.label}
                //   focusAreaColor="green"
                  showAddButton
                  showEditButton
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
