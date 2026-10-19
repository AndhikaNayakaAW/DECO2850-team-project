import type { DateKey, Day } from "./types";

/** Field testing happens in Brisbane; every "today" and "tonight" is worked out in this zone. */
export const DEFAULT_TIME_ZONE = "Australia/Brisbane";

const WEEKDAYS: Day[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export interface Now {
  date: DateKey;
  time: string;
  iso: string;
}

/** The date and clock in the worker's zone. Pass `at` to pin it in tests. */
export function nowIn(timeZone: string = DEFAULT_TIME_ZONE, at: Date = new Date()): Now {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}`, iso: at.toISOString() };
}

function toUtc(date: DateKey): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function isDateKey(value: unknown): value is DateKey {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUtc(value).getTime()) && toUtc(value).toISOString().slice(0, 10) === value;
}

export function isClock(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function addDays(date: DateKey, n: number): DateKey {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

export function weekdayOf(date: DateKey): Day {
  return WEEKDAYS[toUtc(date).getUTCDay()];
}

export function weekdayName(date: DateKey): string {
  return LONG_WEEKDAYS[toUtc(date).getUTCDay()];
}

/** The Monday that starts the week holding `date`. */
export function weekStart(date: DateKey): DateKey {
  const dow = toUtc(date).getUTCDay();
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export function weekDates(date: DateKey): DateKey[] {
  const monday = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function dayNumber(date: DateKey): number {
  return toUtc(date).getUTCDate();
}

/** "Monday 19 October" */
export function longDate(date: DateKey): string {
  if (!isDateKey(date)) return String(date ?? "");
  const d = toUtc(date);
  return `${LONG_WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Mon 19 Oct" */
export function shortDate(date: DateKey): string {
  if (!isDateKey(date)) return String(date ?? "");
  const d = toUtc(date);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

/** "19–25 Oct", or "28 Sep – 4 Oct" across a month. */
export function weekLabel(date: DateKey): string {
  const days = weekDates(date);
  const a = toUtc(days[0]);
  const b = toUtc(days[6]);
  const month = (d: Date) => MONTHS[d.getUTCMonth()].slice(0, 3);
  return a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}–${b.getUTCDate()} ${month(b)}` : `${a.getUTCDate()} ${month(a)} – ${b.getUTCDate()} ${month(b)}`;
}

/** How a date reads mid-sentence: "tonight", "today", "tomorrow", "Friday", or "Wed 28 Oct". */
export function whenWord(date: DateKey, start: string, now: Pick<Now, "date">): string {
  if (!isDateKey(date)) return String(date ?? "");
  const ahead = daysBetween(now.date, date);
  if (ahead === 0) return Number(start.slice(0, 2)) >= 16 ? "tonight" : "today";
  if (ahead === 1) return "tomorrow";
  if (ahead > 1 && ahead < 7) return weekdayName(date);
  return shortDate(date);
}

/** Minutes since 1 Jan 1970 for a local date and clock, for comparing across days. */
export function stamp(date: DateKey, time: string): number {
  const [h, m] = time.split(":").map(Number);
  return toUtc(date).getTime() / 60_000 + h * 60 + (m || 0);
}
