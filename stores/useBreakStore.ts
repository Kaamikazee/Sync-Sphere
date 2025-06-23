// stores/useBreakStore.ts
import { create } from "zustand";

interface BreakStore {
  breakReason: string;
  setBreakReason: (vale: string) => void;
}

export const useBreakStore = create<BreakStore>((set) => ({
  breakReason: "other",
  setBreakReason: (value) => set({breakReason: value})
}));
