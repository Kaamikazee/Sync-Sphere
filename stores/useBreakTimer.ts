// stores/useBreakTimer.ts
import { create } from "zustand";

interface BreakTimerState {
  isRunning: boolean;
  startTime: number | null;
  duration: number;
  start: () => void;
  stop: () => void;
  reset: () => void;
  initialize: () => void;
}


export const useBreakTimer = create<BreakTimerState>((set, get) => ({
  isRunning: false,
  startTime: null,
  duration: 0,

  start: () => {
  if (!get().isRunning) {
    const now = Date.now();
    localStorage.setItem("breakStartTime", now.toString());
    set({ isRunning: true, startTime: now });
  }
},

stop: () => {
  const now = Date.now();
  const { isRunning, startTime, duration } = get();
  if (isRunning && startTime) {
    const delta = Math.floor((now - startTime) / 1000);
    localStorage.removeItem("breakStartTime");
    set({ isRunning: false, duration: duration + delta, startTime: null });
  }
},

initialize: () => {
  const stored = localStorage.getItem("breakStartTime");
  if (stored) {
    const ts = parseInt(stored);
    if (!isNaN(ts)) {
      set({ isRunning: true, startTime: ts });
    }
  }
},

  reset: () => set({ isRunning: false, startTime: null, duration: 0 }),
}));
