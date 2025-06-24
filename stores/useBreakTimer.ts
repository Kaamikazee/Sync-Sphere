// stores/useBreakTimer.ts
import { create } from "zustand";

interface BreakTimerState {
  isRunning: boolean;
  startTime: number | null; // timestamp in ms
  duration: number; // in seconds (accumulated)
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export const useBreakTimer = create<BreakTimerState>((set, get) => ({
  isRunning: false,
  startTime: null,
  duration: 0,

  start: () => {
    if (!get().isRunning) {
      set({ isRunning: true, startTime: Date.now() });
    }
  },

  stop: () => {
    const now = Date.now();
    const { isRunning, startTime, duration } = get();
    if (isRunning && startTime) {
      const delta = Math.floor((now - startTime) / 1000);
      set({ isRunning: false, duration: duration + delta, startTime: null });
    }
  },

  reset: () => set({ isRunning: false, startTime: null, duration: 0 }),
}));
