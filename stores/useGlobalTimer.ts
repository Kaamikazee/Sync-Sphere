// stores/useGlobalTimer.ts
import { create } from "zustand";

interface TimerState {
  running: boolean;
  activeFocusAreaId: string | null;
  setRunning: (value: boolean, resetOnStart?: boolean) => void;
  setActiveFocusAreaId: (id: string | null) => void;
  stopRequested: boolean;
  triggerStop: () => void;
  resetStop: () => void;
}

export const useRunningStore = create<TimerState>((set) => ({
  running: false,
  activeFocusAreaId: null,
  setRunning: (value, resetOnStart = false) => {
    if (value && resetOnStart) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("focusStartTime");
      }
    }
    set({ running: value });
  },
  setActiveFocusAreaId: (id) => {
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem("activeFocusAreaId", id);
      } else {
        localStorage.removeItem("activeFocusAreaId");
      }
    }
    set({ activeFocusAreaId: id });
  },
  stopRequested: false,
  triggerStop: () => set({ stopRequested: true }),
  resetStop: () => set({ stopRequested: false }),
}));
