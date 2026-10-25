/**
 * "How was the work?" after a shift: four work words, asked once on the watch, kept by the worker.
 * Design rationale and sources: docs/design/2026-10-23-shift-check-in.md.
 */
import { minutes } from "./logic";
import { addDays, daysBetween, nowIn } from "./time";
import type { DataSlice, Effort, Shift } from "./types";

export const EFFORTS: Effort[] = ["light", "steady", "busy", "hard"];

export const EFFORT_WORD: Record<Effort, string> = { light: "Light", steady: "Steady", busy: "Busy", hard: "Hard" };

/** One violet, evenly darker for harder. No red, amber or green, and readable with colour-blind vision. */
export const EFFORT_COLOUR: Record<Effort, string> = { light: "#E5D8F0", steady: "#C3ABD2", busy: "#A382B3", hard: "#805C8C" };

/** Asked about 15 minutes after the rostered end, when the worker is no longer closing up. */
const ASK_AFTER = 15;
/** After this the moment has passed: the shift stays rateable on the calendar, and the watch stays quiet. */
const ASK_UNTIL = 12 * 60;

export function isEffort(v: unknown): v is Effort {
  return typeof v === "string" && (EFFORTS as string[]).includes(v);
}

/** Minutes since the shift ended, in the worker's zone; negative while it is still on. A finish before the start is the next morning. */
export function minutesSinceEnd(shift: Pick<Shift, "date" | "start" | "end">, timeZone: string, at: Date = new Date()): number {
  const endDate = minutes(shift.end) <= minutes(shift.start) ? addDays(shift.date, 1) : shift.date;
  const now = nowIn(timeZone, at);
  return daysBetween(endDate, now.date) * 24 * 60 + minutes(now.time) - minutes(shift.end);
}

/** The shift the watch should ask about now, if any: the latest one that ended in the window, unrated and not skipped. */
export function checkInDue(data: DataSlice, at: Date = new Date()): Shift | null {
  const due = data.shifts
    .filter((s) => !s.effort && !s.effortSkipped)
    .map((s) => ({ s, since: minutesSinceEnd(s, data.settings.timeZone, at) }))
    .filter(({ since }) => since >= ASK_AFTER && since <= ASK_UNTIL)
    .sort((a, b) => a.since - b.since);
  return due[0]?.s ?? null;
}

/**
 * What the edit form should save for the rating: nothing when the worker left it as it was when the form opened,
 * so a rating that arrived from the watch while the form was open is never wiped; null to clear it.
 */
export function effortToSave(opened: Effort | undefined, chosen: Effort | undefined): Effort | null | undefined {
  return opened === chosen ? undefined : (chosen ?? null);
}

/** Saves the answer on that shift, or a skip. Nothing is sent to anyone. Null for an unknown or unfinished shift. */
export function applyEffort(data: DataSlice, shiftId: string, level: Effort | "skip", at: Date = new Date()): { data: DataSlice; toast: string } | null {
  const shift = data.shifts.find((s) => s.id === shiftId);
  if (!shift || minutesSinceEnd(shift, data.settings.timeZone, at) < 0) return null;
  const next: Shift = level === "skip" ? { ...shift, effort: undefined, effortSkipped: true } : { ...shift, effort: level, effortSkipped: undefined };
  const toast = level === "skip" ? "Skipped. You can rate it on your calendar." : `Saved: ${EFFORT_WORD[level]}. Change it on your calendar.`;
  return { data: { ...data, shifts: data.shifts.map((s) => (s.id === shiftId ? next : s)) }, toast };
}
