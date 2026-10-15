/** Provisional file-import adapter. No live Garmin connection is claimed. */
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
export const WATCH_TIMEZONE = "Australia/Brisbane";
const MINUTE = 60_000;

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) && validDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a watch export object.");
  return value as Record<string, unknown>;
}

/** All-or-nothing validation. Device labels are supplied by the file, not verified. */
export function parseWatchExport(input: unknown, receivedAt: string): WatchReading[] {
  const packet = record(input);
  if (packet.version !== 1 || typeof packet.device !== "string" || !packet.device.trim() || packet.device.length > 100) throw new Error("Use export version 1 and a device name (up to 100 characters).");
  if (!validTimestamp(receivedAt)) throw new Error("Import time must include a timezone.");
  if (!Array.isArray(packet.readings) || !packet.readings.length || packet.readings.length > 5000) throw new Error("Include between 1 and 5,000 heart-rate readings.");
  const ids = new Set<string>();
  const readings = packet.readings.map((value): WatchReading => {
    const r = record(value);
    if (typeof r.id !== "string" || !r.id.trim() || r.id.length > 80 || ids.has(r.id)) throw new Error("Every reading needs a unique id (up to 80 characters).");
    if (!validTimestamp(r.recordedAt)) throw new Error("Recording timestamps must be valid ISO dates with a timezone, for example 2026-09-16T14:20:00+10:00.");
    if (typeof r.bpm !== "number" || !Number.isFinite(r.bpm) || r.bpm <= 0 || r.bpm > 300) throw new Error("Each bpm value must be a number greater than 0 and no higher than 300.");
    ids.add(r.id);
    return { id: r.id, recordedAt: r.recordedAt, bpm: r.bpm, source: (packet.device as string).trim(), origin: "imported", receivedAt };
  });
  return readings.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}

export function readingDate(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: WATCH_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp));
  const get = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function watchTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: WATCH_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(timestamp));
}
function activityBounds(activity: CalendarActivity): [number, number] {
  if (!validDate(activity.date) || ![activity.start, activity.end].every((s) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s))) throw new Error("Choose a valid activity date and time.");
  const start = Date.parse(`${activity.date}T${activity.start}:00+10:00`);
  let end = Date.parse(`${activity.date}T${activity.end}:00+10:00`);
  if (end < start) end += 24 * 60 * MINUTE;
  return [start, end];
}
export function readingsAround(readings: WatchReading[], activity: CalendarActivity): WatchReading[] {
  const [start, end] = activityBounds(activity);
  return readings.filter((r) => {
    const at = Date.parse(r.recordedAt);
    return at >= start - 30 * MINUTE && at <= end + 30 * MINUTE;
  }).sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}
export function recoveryPreview(activity: CalendarActivity): RecoveryPlan {
  const [, end] = activityBounds(activity);
  const start = new Date(end + 30 * MINUTE).toISOString();
  const finish = new Date(end + 60 * MINUTE).toISOString();
  return { date: readingDate(start), start: watchTime(start), end: watchTime(finish), title: "Recovery time" };
}
export const demoReadings: WatchReading[] = [
  ["11:40", 74], ["12:45", 89], ["14:20", 96], ["15:30", 91], ["16:10", 82], ["17:00", 76],
].map(([time, bpm], index) => ({
  id: `demo-hr-${index}`, recordedAt: `2026-09-16T${time}:00+10:00`, bpm: Number(bpm),
  source: "Demo watch fixture", origin: "demo", receivedAt: "2026-09-16T17:01:00+10:00",
}));
