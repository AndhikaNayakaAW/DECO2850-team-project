import { stamp } from "./time";
import type { DateKey, Day } from "./types";

export const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_NAMES: Record<Day, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export function minutes(time: string | undefined): number {
  const parts = String(time || "0:0").split(":").map(Number);
  return parts[0] * 60 + (parts[1] || 0);
}

export function fromMinutes(total: number): string {
  const m = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h < 10 ? "0" : ""}${h}:${mm < 10 ? "0" : ""}${mm}`;
}

/** Earlier end clocks roll into the following day; equal clocks are empty. */
export function elapsedMinutes(start: string, end: string): number {
  const delta = minutes(end) - minutes(start);
  return delta < 0 ? delta + 1440 : delta;
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aEnd > aStart && bEnd > bStart && aStart < bEnd && bStart < aEnd;
}

/** Clock-only ranges repeat daily. Use shiftImpact when the dates matter. */
export function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const a = minutes(aStart);
  const b = minutes(bStart);
  const aFinish = a + elapsedMinutes(aStart, aEnd);
  const bFinish = b + elapsedMinutes(bStart, bEnd);
  return [-1440, 0, 1440].some((offset) => intervalsOverlap(a, aFinish, b + offset, bFinish + offset));
}

export function dayIndex(day: Day): number {
  return DAYS.indexOf(day);
}

export function nextDay(day: Day): Day {
  return DAYS[(dayIndex(day) + 1) % 7];
}

/** Something with a date and a clock range; an end at or before the start finishes the next morning. */
export interface Span {
  date: DateKey;
  start: string;
  end: string;
}

/** Absolute start and finish in minutes, so spans compare across midnight and across weeks. */
export function spanMinutes(span: Span): [number, number] {
  const start = stamp(span.date, span.start);
  return [start, start + elapsedMinutes(span.start, span.end)];
}

export interface Impact<E extends Span> {
  conflicts: E[];
  previous: E | null;
  next: E | null;
  /** Minutes between the previous commitment ending and this one starting, less any travel. */
  gapBefore: number | null;
  /** Minutes from this finishing to the next commitment starting. */
  restAfter: number | null;
}

/** Everything a shift touches: overlaps, the gap before it that day, and the rest window after it. */
export function shiftImpact<E extends Span>(shift: Span & { travel?: number }, events: E[]): Impact<E> {
  const [start, end] = spanMinutes(shift);
  const dayStart = stamp(shift.date, "00:00");
  const timeline = events.map((event) => {
    const [s, e] = spanMinutes(event);
    return { event, start: s, end: e };
  });
  const previous = timeline
    .filter((span) => span.end <= start && span.end >= dayStart && span.end > span.start)
    .sort((a, b) => b.end - a.end)[0];
  const next = timeline
    .filter((span) => span.start >= end && span.end > span.start)
    .sort((a, b) => a.start - b.start)[0];
  return {
    conflicts: timeline.filter((span) => intervalsOverlap(start, end, span.start, span.end)).map((span) => span.event),
    previous: previous?.event ?? null,
    next: next?.event ?? null,
    gapBefore: previous ? start - previous.end - Number(shift.travel || 0) : null,
    restAfter: next ? next.start - end : null,
  };
}

export function orderByPriority<T>(items: T[], priorities: T[]): T[] {
  return items.slice().sort((a, b) => priorities.indexOf(a) - priorities.indexOf(b));
}

export function duration(m: number | null | undefined): string {
  if (m === null || m === undefined) return "No next commitment";
  const total = Math.max(0, m);
  const h = Math.floor(total / 60);
  const min = total % 60;
  if (!h) return `${min}m`;
  return min ? `${h}h ${min}m` : `${h}h`;
}

/** "16:00" -> "4 pm", "15:50" -> "3:50 pm" */
export function clock12(time: string, withSuffix = true): string {
  const m = minutes(time);
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? "am" : "pm";
  const base = mm ? `${h12}:${mm < 10 ? "0" : ""}${mm}` : `${h12}`;
  return withSuffix ? `${base} ${suffix}` : base;
}

/** "16:00","21:00" -> "4–9 pm" */
export function range12(start: string, end: string): string {
  // "24:00" is midnight: am, like "00:00".
  const sAm = minutes(start) % 1440 < 720;
  const eAm = minutes(end) % 1440 < 720;
  if (sAm === eAm) return `${clock12(start, false)}–${clock12(end)}`;
  return `${clock12(start)}–${clock12(end)}`;
}

export function range24(start: string, end: string): string {
  return `${start}–${end}`;
}

export function hoursBetween(start: string, end: string): number {
  return elapsedMinutes(start, end) / 60;
}

export function addMinutesToClock(clock: string, add: number): string {
  return fromMinutes(minutes(clock) + add);
}
