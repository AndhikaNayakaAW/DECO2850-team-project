import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { demoReadings, parseWatchExport, type WatchReading, type RecoveryPlan } from "./watch";

interface PrivateWatchState {
  readings: WatchReading[];
  notes: Record<string, string>;
  recoveries: Record<string, RecoveryPlan>;
  showReadings: boolean;
  importReadings: (input: unknown, receivedAt: string) => void;
  saveReflection: (id: string, note: string) => void;
  confirmRecovery: (id: string, plan: RecoveryPlan) => void;
  setShowReadings: (show: boolean) => void;
  clearPrivateData: () => void;
  loadDemo: () => void;
}
// Private watch data never enters DataSlice, /api/state or assistant context.
const browserStorage: StateStorage = {
  getItem: (key) => { try { return window.localStorage.getItem(key); } catch { return null; } },
  setItem: (key, value) => { try { window.localStorage.setItem(key, value); } catch {} },
  removeItem: (key) => { try { window.localStorage.removeItem(key); } catch {} },
};
export function createPrivateWatchStore(storage: StateStorage = browserStorage) {
  return create<PrivateWatchState>()(persist((set) => ({
    readings: demoReadings.map((r) => ({ ...r })), notes: {}, recoveries: {}, showReadings: true,
    importReadings: (input, receivedAt) => {
      const readings = parseWatchExport(input, receivedAt);
      set({ readings, showReadings: true });
    },
    saveReflection: (id, note) => set((s) => {
      const notes = { ...s.notes };
      if (note.trim()) notes[id] = note.trim().slice(0, 500);
      else delete notes[id];
      return { notes };
    }),
    confirmRecovery: (id, plan) => set((s) => ({ recoveries: { ...s.recoveries, [id]: { ...plan } } })),
    setShowReadings: (showReadings) => set({ showReadings }),
    clearPrivateData: () => set({ readings: [], notes: {}, recoveries: {}, showReadings: false }),
    loadDemo: () => set({ readings: demoReadings.map((r) => ({ ...r })), showReadings: true }),
  }), {
    name: "offshift-private-watch-v1", storage: createJSONStorage(() => storage), skipHydration: true,
    partialize: (s) => ({ readings: s.readings, notes: s.notes, recoveries: s.recoveries, showReadings: s.showReadings }),
  }));
}
export const usePrivateWatchStore = createPrivateWatchStore();
