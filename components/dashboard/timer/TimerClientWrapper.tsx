// components/dashboard/timer/TimerClientWrapper.tsx
"use client";

import React from "react";
import TimerClient from "./TimerClient";
import { Activity } from "@prisma/client";
import { TimersProvider } from "@/types/TimersContext";
// import { TimersProvider } from "@/components/dashboard/timer/TimersContext"; 
// ← make sure this is the file that actually exports the *provider*, not just the types.

export default function TimerClientWrapper({
  activities,
}: {
  activities: Activity[];
}) {
  return (
    <TimersProvider activities={activities}>
      <TimerClient activities={activities} />
    </TimersProvider>
  );
}
