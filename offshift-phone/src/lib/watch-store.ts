import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { demoReadings, type WatchReading, type RecoveryPlan } from "./watch";

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
const missing = () => { throw new Error("Not implemented"); };
export function createPrivateWatchStore(storage?: StateStorage) {
  return create<PrivateWatchState>()(persist(() => ({
    readings: demoReadings, notes: {}, recoveries: {}, showReadings: true,
    importReadings: missing, saveReflection: missing, confirmRecovery: missing,
    setShowReadings: missing, clearPrivateData: missing, loadDemo: missing,
  }), { name: "offshift-private-watch-v1", storage: storage ? createJSONStorage(() => storage) : undefined, skipHydration: true }));
}
