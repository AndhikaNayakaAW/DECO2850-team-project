/** Provisional browser import contract; the teammate's Garmin bridge is not merged yet. */
export interface WatchReading {
  id: string;
  recordedAt: string;
  bpm: number;
  source: string;
  origin: "demo" | "imported";
  receivedAt: string;
}
export interface CalendarActivity { date: string; start: string; end: string }
export interface RecoveryPlan extends CalendarActivity { title: string }
export const demoReadings: WatchReading[] = [];
export function parseWatchExport(_input: unknown, _receivedAt: string): WatchReading[] { throw new Error("Not implemented"); }
export function readingDate(_timestamp: string): string { throw new Error("Not implemented"); }
export function readingsAround(_readings: WatchReading[], _activity: CalendarActivity): WatchReading[] { throw new Error("Not implemented"); }
export function recoveryPreview(_activity: CalendarActivity): RecoveryPlan { throw new Error("Not implemented"); }
