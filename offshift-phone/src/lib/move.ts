/**
 * Moving a plan on the calendar by dragging it to a new day and time: which blocks can be dragged, and what the new
 * slot would touch, as plain facts for the Undo bar. Nothing here gives advice or decides for the worker.
 */
import { DAYS, DAY_NAMES, clock12, dayIndex, minutes, range12 } from "./logic";
import type { Day, DayItem, DayView } from "./types";

/** Where a dragged plan would land: a day, and its new start and end. */
export interface Slot {
  day: Day;
  start: string;
  end: string;
}

/** Only the worker's own plans move by dragging: a shift is rostered, a class comes from the timetable, an ask is the manager's. */
export function canDrag(item: Pick<DayItem, "kind">): boolean {
  return item.kind === "personal";
}

/** Items that take up time on the day, for overlaps and gaps (not due dates, travel, quiet hours or rest). */
function timed(view: DayView, itemId: string): DayItem[] {
  return view.items.filter((it) => it.id !== itemId && it.kind !== "travel" && it.kind !== "boundary" && it.kind !== "rest" && it.kind !== "due");
}

/** What a plan's new slot would overlap or crowd, in plain words. Facts only, no advice. */
export function slotFacts(itemId: string, slot: Slot, days: DayView[]): string[] {
  const out: string[] = [];
  const view = days.find((d) => d.day === slot.day);
  if (!view) return out;
  const s = minutes(slot.start);
  const e = minutes(slot.end);
  const others = timed(view, itemId);
  others.forEach((it) => {
    if (minutes(it.start) < e && s < minutes(it.end)) out.push(`Overlaps ${it.label}, ${range12(it.start, it.end)}.`);
  });
  const before = others.filter((it) => minutes(it.end) <= s).sort((a, b) => minutes(b.end) - minutes(a.end))[0];
  if (before) {
    const gap = s - minutes(before.end);
    if (gap < 30) out.push(`Only ${gap} minutes after ${before.label} ends at ${clock12(before.end)}.`);
  }
  if (view.rest) out.push(`Sits on ${DAY_NAMES[slot.day]}, a rest day you keep clear.`);
  if (e > 22 * 60) out.push("Runs into quiet hours after 10 pm.");
  const nd = DAYS[dayIndex(slot.day) + 1];
  const next = nd && days.find((d) => d.day === nd)?.items.filter((it) => it.kind === "shift" || it.kind === "uni").sort((a, b) => minutes(a.start) - minutes(b.start))[0];
  if (next && e > 21 * 60 && 24 * 60 - e + minutes(next.start) < 10 * 60) out.push(`Leaves ${Math.round((24 * 60 - e + minutes(next.start)) / 60)} hours before ${DAY_NAMES[nd]}'s ${clock12(next.start)} start.`);
  return out;
}
