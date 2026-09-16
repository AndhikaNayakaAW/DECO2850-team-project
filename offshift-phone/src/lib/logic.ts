import type { Day } from "./types";

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

export function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return minutes(aStart) < minutes(bEnd) && minutes(bStart) < minutes(aEnd);
}

export function dayIndex(day: Day): number {
  return DAYS.indexOf(day);
}

export function absMinutes(day: Day, time: string): number {
  return dayIndex(day) * 1440 + minutes(time);
}

export function nextDay(day: Day): Day {
  return DAYS[(dayIndex(day) + 1) % 7];
}

export interface Span {
  day: Day;
  start: string;
  end: string;
}

export function paidMinutes(shift: { start: string; end: string; break?: number }): number {
  return Math.max(0, minutes(shift.end) - minutes(shift.start) - Number(shift.break || 0));
}

export function income(shift: { start: string; end: string; break?: number }, rate: number): number {
  return Math.round((paidMinutes(shift) / 60) * rate * 100) / 100;
}

export interface Impact<E extends Span> {
  conflicts: E[];
  previous: E | null;
  next: E | null;
  travelBuffer: number | null;
  restMinutes: number | null;
  paidMinutes: number;
}

/** Everything a shift touches: overlaps, the gap before it, and the rest window after it. */
export function shiftImpact<E extends Span>(
  shift: Span & { travel?: number; break?: number },
  events: E[],
): Impact<E> {
  const dayEvents = events.filter((event) => event.day === shift.day);
  const previous =
    dayEvents
      .filter((event) => minutes(event.end) <= minutes(shift.start))
      .sort((a, b) => minutes(b.end) - minutes(a.end))[0] || null;
  const next =
    events
      .filter(
        (event) =>
          dayIndex(event.day) > dayIndex(shift.day) ||
          (event.day === shift.day && minutes(event.start) >= minutes(shift.end)),
      )
      .sort((a, b) => absMinutes(a.day, a.start) - absMinutes(b.day, b.start))[0] || null;
  const conflicts = dayEvents.filter((event) => overlap(shift.start, shift.end, event.start, event.end));
  const gap = previous ? minutes(shift.start) - minutes(previous.end) : null;
  const restMinutes = next ? absMinutes(next.day, next.start) - absMinutes(shift.day, shift.end) : null;
  return {
    conflicts,
    previous,
    next,
    travelBuffer: gap === null ? null : gap - Number(shift.travel || 0),
    restMinutes,
    paidMinutes: paidMinutes(shift),
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
  const sAm = minutes(start) < 720;
  const eAm = minutes(end) < 720;
  if (sAm === eAm) return `${clock12(start, false)}–${clock12(end)}`;
  return `${clock12(start)}–${clock12(end)}`;
}

export function range24(start: string, end: string): string {
  return `${start}–${end}`;
}

export function hoursBetween(start: string, end: string): number {
  return (minutes(end) - minutes(start)) / 60;
}

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

export function addMinutesToClock(clock: string, add: number): string {
  return fromMinutes(minutes(clock) + add);
}
