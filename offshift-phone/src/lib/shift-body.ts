/**
 * Heart rate and stress during each shift, from the worker's own watch, 15 minutes at a time.
 * Only the shift's own hours are read, only as levels from 0 to 3, and only while the worker shares.
 * Rationale and sources: docs/design/2026-10-25-biometrics-during-shifts.md.
 */
import { minutesSinceEnd } from "./effort";
import { uid } from "./ids";
import { clock12, elapsedMinutes, fromMinutes, minutes, range12 } from "./logic";
import { addDays, instantOf, shortDate } from "./time";
import type { DataSlice, Load, Shift, ShiftBody, ShiftSignal } from "./types";

export const BLOCK_MINUTES = 15;
/** A day's worth of blocks: the most any shift can have. */
const MAX_BLOCKS = 96;
/** Read about 15 minutes after the rostered end, like the check-in; after 12 hours the moment has passed. */
const READ_AFTER = 15;
const READ_UNTIL = 12 * 60;

export const SHIFT_SIGNALS: ShiftSignal[] = ["stress", "heart"];

export const SIGNAL_NAME: Record<ShiftSignal, string> = { stress: "Stress", heart: "Heart" };

/**
 * One word per level, 0 to 3. Stress uses Garmin's own bands (0–25 resting, 26–50 low, 51–75 medium, 76–100 high).
 * Heart uses the share of the worker's heart-rate reserve, between their resting and maximum rate, in the bands
 * exercise science uses for intensity (under 30% very light, 30–39% light, 40–59% moderate, 60% and over vigorous).
 */
export const LOAD_WORDS: Record<ShiftSignal, readonly [string, string, string, string]> = {
  stress: ["Resting", "Low", "Medium", "High"],
  heart: ["Very light", "Light", "Moderate", "Vigorous"],
};

/** What darker means, for the key: "darker: more stress". */
export const SIGNAL_MEANING: Record<ShiftSignal, string> = { stress: "more stress", heart: "harder heart work" };

/**
 * ColorBrewer's yellow-green-blue (YlGnBu), darker for more. Each step is easy to tell from the next even in a small
 * cell, which the old greys weren't; it has no red, stays clear of the violet work ratings and the amber asks, and
 * reads with colour-blind vision.
 */
export const LOAD_COLOUR = ["#A1DAB4", "#41B6C4", "#2C7FB8", "#253494"] as const;

/** How many 15-minute blocks a shift has. A shift that ends before it starts runs past midnight. */
export function blockCount(shift: Pick<Shift, "start" | "end">): number {
  return Math.max(1, Math.ceil(elapsedMinutes(shift.start, shift.end) / BLOCK_MINUTES));
}

/** The clock times of each block, from the shift's start; the last one ends with the shift. */
export function blockTimes(shift: Pick<Shift, "start" | "end">): { start: string; end: string }[] {
  const total = elapsedMinutes(shift.start, shift.end);
  const from = minutes(shift.start);
  return Array.from({ length: blockCount(shift) }, (_, i) => ({ start: fromMinutes(from + i * BLOCK_MINUTES), end: fromMinutes(from + Math.min(total, (i + 1) * BLOCK_MINUTES)) }));
}

/**
 * The time labels under a shift's graph: its start, whole hours (every second hour past six hours, every third past
 * twelve) and its end. `at` runs 0 to 1 along the shift. An hour closer than 30 minutes to either end is left out so
 * labels never overlap.
 */
export function timeMarks(shift: Pick<Shift, "start" | "end">): { at: number; label: string }[] {
  const total = elapsedMinutes(shift.start, shift.end);
  const from = minutes(shift.start);
  const step = total <= 360 ? 60 : total <= 720 ? 120 : 180;
  const marks = [{ at: 0, label: clock12(shift.start) }];
  for (let t = Math.ceil(from / step) * step; t < from + total; t += step) {
    const offset = t - from;
    if (offset >= 30 && total - offset >= 30) marks.push({ at: offset / total, label: clock12(fromMinutes(t)) });
  }
  marks.push({ at: 1, label: clock12(shift.end) });
  return marks;
}

/** Whether the watch read anything during a shift, so the 3D week can mark it. A shift of nothing but gaps has nothing to show. */
export function hasReading(body: ShiftBody | undefined): boolean {
  return !!body && [...body.stress, ...body.heart].some((v) => v !== null);
}

/** When the shift ran, as instants in seconds, so the watch can read exactly those hours without knowing the zone. */
export function shiftWindow(shift: Pick<Shift, "date" | "start" | "end">, timeZone: string): { from: number; to: number } {
  const endDate = minutes(shift.end) <= minutes(shift.start) ? addDays(shift.date, 1) : shift.date;
  return { from: instantOf(shift.date, shift.start, timeZone) / 1000, to: instantOf(endDate, shift.end, timeZone) / 1000 };
}

/** The shift the watch should read now, if any: the latest one that ended in the window and has no readings yet. */
export function shiftBodyDue(data: DataSlice, at: Date = new Date()): Shift | null {
  const due = data.shifts
    .filter((s) => !s.body)
    .map((s) => ({ s, since: minutesSinceEnd(s, data.settings.timeZone, at) }))
    .filter(({ since }) => since >= READ_AFTER && since <= READ_UNTIL)
    .sort((a, b) => a.since - b.since);
  return due[0]?.s ?? null;
}

export interface ShiftBodyInput {
  shiftId: string;
  /** The window the watch read, in seconds since 1970, as the summary gave it. */
  from: number;
  to: number;
  stress: (Load | null)[];
  heart: (Load | null)[];
}

/**
 * One level per block. The watch sends them as text, one character per 15 minutes ("21-3": 0 to 3, or - for no
 * reading), because a watch request body can't be relied on to carry lists or nulls. A list is accepted too.
 */
function loads(v: unknown): (Load | null)[] | null {
  if (typeof v === "string") {
    if (!/^[0-3-]{1,96}$/.test(v)) return null;
    return [...v].map((c) => (c === "-" ? null : (Number(c) as Load)));
  }
  if (!Array.isArray(v) || v.length < 1 || v.length > MAX_BLOCKS) return null;
  return v.every((x) => x === null || (Number.isInteger(x) && x >= 0 && x <= 3)) ? (v as (Load | null)[]) : null;
}

/** Why a reading wasn't stored, for the worker's own log. */
export const REFUSED: Record<"parse" | "missing" | "unfinished" | "moved" | "length", string> = {
  parse: "it wasn't in a form the calendar reads",
  missing: "that shift isn't on the calendar",
  unfinished: "that shift hadn't finished",
  moved: "the shift's times changed after the watch read it",
  length: "it didn't fit the shift's length",
};

/** A private line saying a reading wasn't stored, added once in a row so a watch that keeps trying doesn't fill the log. */
export function noteRefused(data: DataSlice, why: keyof typeof REFUSED, at: Date = new Date()): DataSlice {
  const text = `A reading from the watch wasn't stored: ${REFUSED[why]}.`;
  if (data.sync.at(-1)?.text === text) return data;
  return { ...data, sync: [...data.sync, { id: uid("y"), at: at.toISOString(), from: "Watch", to: "Only you", text }] };
}

/** Keeps only what the watch is allowed to send: the window it read, and a level from 0 to 3, or no reading, per block, for both signals. */
export function parseShiftBody(input: unknown): ShiftBodyInput | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  const stress = loads(o.stress);
  const heart = loads(o.heart);
  if (typeof o.shiftId !== "string" || !o.shiftId || o.shiftId.length > 80 || !stress || !heart || stress.length !== heart.length) return null;
  if (!Number.isInteger(o.from) || !Number.isInteger(o.to) || (o.to as number) <= (o.from as number)) return null;
  return { shiftId: o.shiftId, from: o.from as number, to: o.to as number, stress, heart };
}

function logText(shift: Shift): string {
  return `Read your ${shift.workplace} shift, ${shortDate(shift.date)} ${range12(shift.start, shift.end)}. Kept private.`;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isReadLine = (e: { from: string; text: string }) => e.from === "Watch" && e.text.startsWith("Read your");

/**
 * Stores the watch's blocks on that shift. Nothing goes to anyone else. Readings for a window the shift no longer has
 * (it was moved after the watch read it) are refused, and the same readings arriving twice are stored once.
 */
export function applyShiftBody(data: DataSlice, input: ShiftBodyInput, at: Date = new Date()): { data: DataSlice } | { problem: "missing" | "unfinished" | "moved" | "length" } {
  const shift = data.shifts.find((s) => s.id === input.shiftId);
  if (!shift) return { problem: "missing" };
  if (minutesSinceEnd(shift, data.settings.timeZone, at) < 0) return { problem: "unfinished" };
  const window = shiftWindow(shift, data.settings.timeZone);
  if (input.from !== window.from || input.to !== window.to) return { problem: "moved" };
  if (input.stress.length !== blockCount(shift) || input.heart.length !== blockCount(shift)) return { problem: "length" };
  if (shift.body && same(shift.body.stress, input.stress) && same(shift.body.heart, input.heart)) return { data };
  const body: ShiftBody = { receivedAt: at.toISOString(), stress: input.stress, heart: input.heart };
  return {
    data: {
      ...data,
      shifts: data.shifts.map((s) => (s.id === shift.id ? { ...s, body } : s)),
      sync: shift.body ? data.sync : [...data.sync, { id: uid("y"), at: at.toISOString(), from: "Watch", to: "Only you", text: logText(shift) }],
    },
  };
}

/** Sharing turned off on the watch: every shift's readings go, and so do the log lines about them. */
export function forgetShiftBodies(data: DataSlice, at: Date = new Date()): DataSlice {
  if (!data.shifts.some((s) => s.body) && !data.sync.some(isReadLine)) return data;
  return {
    ...data,
    shifts: data.shifts.map((s) => (s.body ? { ...s, body: undefined } : s)),
    sync: [...data.sync.filter((e) => !isReadLine(e)), { id: uid("y"), at: at.toISOString(), from: "Watch", to: "Only you", text: "Sharing turned off on the watch. The calendar forgot the shift readings." }],
  };
}

/** "45 min", "1 hour", "1 h 15 min". */
export function spanText(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} hour${h === 1 ? "" : "s"}`;
}

/** Where in a shift most of some blocks fall: "early on", "in the middle", "near the end", or nowhere in particular. */
export function wherePhrase(positions: number[]): string {
  if (!positions.length) return "";
  const thirds = [0, 0, 0];
  for (const p of positions) thirds[Math.min(2, Math.floor(p * 3))] += 1;
  const most = thirds.indexOf(Math.max(...thirds));
  if (thirds[most] * 3 < positions.length * 2) return "";
  return ["early on", "in the middle", "near the end"][most];
}

/** Each block's middle, as a share of the shift: 0 at the start, 1 at the end. */
export function positionsOf(levels: (Load | null)[], level: Load): number[] {
  return levels.flatMap((v, i) => (v === level ? [(i + 0.5) / levels.length] : []));
}

/** The level most blocks read, the higher one on a tie. */
function mostly(levels: Load[]): Load {
  const counts = [0, 0, 0, 0];
  for (const v of levels) counts[v] += 1;
  let best = 0;
  for (let l = 1; l <= 3; l++) if (counts[l] >= counts[best]) best = l;
  return best as Load;
}

/**
 * One plain sentence about a signal during a shift: what most of it read, the highest it went and when,
 * and how long the watch had no reading. Never a cause, a verdict or advice.
 */
export function describeSignal(levels: (Load | null)[], signal: ShiftSignal): string | null {
  const real = levels.filter((v): v is Load => v !== null);
  if (!levels.length) return null;
  if (!real.length) return `No ${signal} reading from your watch.`;
  const words = LOAD_WORDS[signal];
  const name = SIGNAL_NAME[signal];
  const usual = mostly(real);
  const top = Math.max(...real) as Load;
  const missing = levels.length - real.length;
  let text: string;
  if (top === usual && !missing && real.every((v) => v === usual)) text = `${name} ${words[usual].toLowerCase()} throughout`;
  else if (top === usual) text = `${name} mostly ${words[usual].toLowerCase()}`;
  else {
    const where = wherePhrase(positionsOf(levels, top));
    text = `${name} mostly ${words[usual].toLowerCase()}, ${words[top].toLowerCase()} for ${spanText(real.filter((v) => v === top).length * BLOCK_MINUTES)}${where ? ` ${where}` : ""}`;
  }
  return `${text}.${missing >= 2 ? ` No reading for ${spanText(missing * BLOCK_MINUTES)}.` : ""}`;
}

/** Both signals for a shift, stress first, or null when the watch didn't read it. */
export function shiftBodyLines(shift: Pick<Shift, "body">): string[] {
  if (!shift.body) return [];
  return SHIFT_SIGNALS.map((s) => describeSignal(shift.body![s], s)).filter((t): t is string => !!t);
}
