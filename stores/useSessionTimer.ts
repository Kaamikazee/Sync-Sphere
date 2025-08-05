import { create } from "zustand";

interface SessionTimerState {
  startTime: number | null;
  duration: number;
  initialize: () => void;
  reset: () => void;
  setStartTime: (ts: number) => void;
  stopAndPersist: () => void;
}

export const useSessionTimer = create<SessionTimerState>((set, get) => ({
  startTime: null,
  duration: 0,

  initialize: () => {
    const stored = localStorage.getItem("sessionStartTime");
    if (stored) {
      const ts = parseInt(stored);
      if (!isNaN(ts)) {
        set({ startTime: ts });
      }
    }
  },

  setStartTime: (ts) => {
    localStorage.setItem("sessionStartTime", ts.toString());
    set({ startTime: ts });
  },

  stopAndPersist: () => {
    const { startTime, duration } = get();
    if (startTime) {
      const now = Date.now();
      const delta = Math.floor((now - startTime) / 1000);
      localStorage.removeItem("sessionStartTime");
      set({ duration: duration + delta, startTime: null });
    }
  },

  reset: () => {
    localStorage.removeItem("sessionStartTime");
    set({ startTime: null, duration: 0 });
  },
}));
