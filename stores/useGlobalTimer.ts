// stores/useControlStore.ts (or another store file)
import { create } from "zustand";

interface TimerState {
  running: boolean;
  setRunning: (value: boolean) => void;
  stopRequested: boolean;
  triggerStop: () => void;
  resetStop: () => void;
}

export const useRunningStore = create<TimerState>((set) => ({
  running: false,
  setRunning: (value) => set({ running: value }),
  stopRequested: false,
  triggerStop: () => set({ stopRequested: true }),
  resetStop: () => set({ stopRequested: false }),
}));
