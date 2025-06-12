"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Howl } from "howler";
import { pathsToSoundEffects } from "@/lib/utils";
import { PomodoroSettings } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkipForward, Settings } from "lucide-react";
import Link from "next/link";

interface Props {
  pomodoroSettings: PomodoroSettings;
}

export default function PomodoroContainer({
  pomodoroSettings: {
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    longBreakInterval,
    soundEffect,
    soundEffectVolume,
  },
}: Props) {
  const [timer, setTimer] = useState({ minutes: workDuration, seconds: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [completedIntervals, setCompletedIntervals] = useState(0);
  const [isBreak, setIsBreak] = useState(false);

  const handleTimerEnd = useCallback(() => {
    setIsRunning(false);
    const nextIsBreak = !isBreak;
    setIsBreak(nextIsBreak);
    if (!isBreak) {
      setCompletedIntervals((prev) => prev + 1);
      const nextDuration =
        completedIntervals + 1 === longBreakInterval
          ? longBreakDuration
          : shortBreakDuration;
      setTimer({ minutes: nextDuration, seconds: 0 });
    } else {
      setTimer({ minutes: workDuration, seconds: 0 });
    }
    // play sound
    const sound = new Howl({
      src: [pathsToSoundEffects[soundEffect]],
      html5: true,
      volume: soundEffectVolume,
    });
    sound.play();
  }, [isBreak, completedIntervals, longBreakInterval, longBreakDuration, shortBreakDuration, workDuration, soundEffect, soundEffectVolume]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        if (timer.minutes === 0 && timer.seconds === 0) {
          clearInterval(interval);
          handleTimerEnd();
        } else if (timer.seconds === 0) {
          setTimer(({ minutes }) => ({ minutes: minutes - 1, seconds: 59 }));
        } else {
          setTimer(({ minutes, seconds }) => ({ minutes, seconds: seconds - 1 }));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer, handleTimerEnd]);

  const formattedMinutes = useMemo(
    () => (timer.minutes < 10 ? `0${timer.minutes}` : timer.minutes),
    [timer.minutes]
  );
  const formattedSeconds = useMemo(
    () => (timer.seconds < 10 ? `0${timer.seconds}` : timer.seconds),
    [timer.seconds]
  );

  return (
    <div className="flex flex-col items-center justify-start pt-10 bg-gradient-to-br from-blue-800 to-indigo-900 p-6 mt-5">
      <div className="flex items-center justify-between w-full max-w-4xl mb-6">
        <h1 className="text-4xl font-extrabold text-white uppercase tracking-wider drop-shadow-lg">
          🔥 POMODORO CLOCK
        </h1>
        <Link href={"pomodoro/settings"}>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 via-red-500 to-orange-400 text-white shadow-lg rounded-full p-2"
          >
          <Settings className="w-5 h-5" /> Settings
        </Button>
          </Link>
      </div>

      <Card className="w-full sm:w-auto sm:min-w-[40rem] bg-white/5 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
        <CardHeader className="text-center py-8">
          <CardTitle className="text-7xl md:text-9xl text-white tracking-tight">
            {formattedMinutes}:{formattedSeconds}
          </CardTitle>
          <CardDescription className="mt-4 text-lg md:text-2xl text-white/80">
            {isBreak ? "🌴 Break Time" : "💼 Work Time"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center gap-4 pb-8">
          <Button
            size="lg"
            className="bg-gradient-to-r from-green-400 to-teal-400 text-white font-bold uppercase px-8 py-4 rounded-full shadow-lg hover:scale-105 transition-transform"
            onClick={() => setIsRunning((prev) => !prev)}
          >
            {isRunning ? "Stop" : "Start"}
          </Button>
          {isRunning && (
            <Button
              size="lg"
              className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full p-4 shadow-lg hover:scale-105 transition-transform"
              onClick={handleTimerEnd}
            >
              <SkipForward size={28} />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
