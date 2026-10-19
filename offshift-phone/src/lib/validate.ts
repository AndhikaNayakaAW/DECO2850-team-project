import { BODY_SIGNALS } from "./body";
import { DAYS } from "./logic";
import { isClock, isDateKey } from "./time";
import { SCHEMA, type DataSlice } from "./types";

/**
 * Checks a week that arrived over the network or from storage, field by field, and returns a clean copy
 * with only the fields Offshift knows. Anything malformed is refused whole, so a bad write can never
 * reach the watch, another device's store or the server.
 */

const BAD = Symbol("bad");
type Clean = (v: unknown) => unknown;

const text =
  (max: number, nonEmpty = false): Clean =>
  (v) =>
    typeof v === "string" && v.length <= max && (!nonEmpty || v.trim() !== "") ? v : BAD;
const oneOf =
  (options: readonly (string | number)[]): Clean =>
  (v) =>
    options.includes(v as string | number) ? v : BAD;
const check =
  (ok: (v: unknown) => boolean): Clean =>
  (v) =>
    ok(v) ? v : BAD;
/** Absent, or null, is fine. */
const optional =
  (clean: Clean): Clean =>
  (v) =>
    v === undefined || v === null ? undefined : clean(v);

const id = text(80, true);
const date = check(isDateKey);
const clock = check(isClock);
const iso = check((v) => typeof v === "string" && v.length <= 40 && Number.isFinite(Date.parse(v)));
const level = oneOf([0, 1, 2, 3]);
const zone = check((v) => {
  if (typeof v !== "string" || !v || v.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: v });
    return true;
  } catch {
    return false;
  }
});

function object(fields: Record<string, Clean>): Clean {
  return (v) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return BAD;
    const out: Record<string, unknown> = {};
    for (const [key, clean] of Object.entries(fields)) {
      const c = clean((v as Record<string, unknown>)[key]);
      if (c === BAD) return BAD;
      if (c !== undefined) out[key] = c;
    }
    return out;
  };
}

/** A list of up to `max` items, each with its own id. */
function list(item: Clean, max = 1000): Clean {
  return (v) => {
    if (!Array.isArray(v) || v.length > max) return BAD;
    const out: unknown[] = [];
    const ids = new Set<string>();
    for (const x of v) {
      const c = item(x);
      if (c === BAD) return BAD;
      const key = (c as { id?: string }).id;
      if (key !== undefined) {
        if (ids.has(key)) return BAD;
        ids.add(key);
      }
      out.push(c);
    }
    return out;
  };
}

const shift = object({ id, date, start: clock, end: clock, workplace: text(80, true), rated: optional(oneOf(["fine", "tired", "wiped"])), viaOffer: optional(id), note: optional(text(500)) });
const uni = object({ id, date, start: clock, end: clock, title: text(80, true), type: oneOf(["class", "due"]) });
const plan = object({
  id,
  date,
  start: clock,
  end: clock,
  title: text(80, true),
  note: optional(text(500)),
  category: optional(oneOf(["study", "personal", "rest", "appointment", "custom"])),
  importance: optional(oneOf(["flexible", "important", "protected"])),
});
const alt = object({ date, start: clock, end: clock, label: text(80) });
const offer = object({
  id,
  from: text(40, true),
  workplace: text(80, true),
  date,
  start: clock,
  end: clock,
  note: text(1000),
  sentAt: iso,
  status: oneOf(["pending", "deferred", "accepted", "declined", "countered", "alt-confirmed", "swap-requested", "swapped"]),
  alt: optional(alt),
  colleague: optional(text(40)),
  reminderAt: optional(iso),
  reminded: optional(check((v) => typeof v === "boolean")),
  repliedAt: optional(iso),
});
const message = object({ id, offerId: optional(id), from: oneOf(["team", "worker"]), text: text(2000), at: iso });
const entry = object({ id, at: iso, from: text(40), to: text(40), text: text(500), offerId: optional(id) });
const settings = object({
  name: text(40),
  tone: oneOf(["warm", "plain"]),
  restDays: check((v) => Array.isArray(v) && v.length <= 7 && new Set(v).size === v.length && v.every((d) => (DAYS as string[]).includes(d))),
  protectedIds: check((v) => Array.isArray(v) && v.length <= 1000 && v.every((x) => typeof x === "string" && x.length <= 80)),
  lateFinish: clock,
  lateFinishesBeforeFlag: check((v) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 7),
  timeZone: zone,
});
const wearable = object({
  level,
  word: text(40),
  at: clock,
  source: text(40),
  receivedAt: optional(iso),
  signals: optional(object(Object.fromEntries(BODY_SIGNALS.map((k) => [k, optional(level)])))),
});

const week = object({
  schema: oneOf([SCHEMA]),
  sessionStartedAt: iso,
  shifts: list(shift),
  uni: list(uni),
  personal: list(plan),
  offers: list(offer),
  messages: list(message, 2000),
  sync: list(entry, 2000),
  settings,
  wearable: optional(wearable),
});

/** The week in the current shape, cleaned, or null if anything in it is malformed or from an older version. */
export function cleanData(input: unknown): DataSlice | null {
  const c = week(input);
  if (c === BAD) return null;
  const data = c as DataSlice;
  if (data.wearable === undefined) data.wearable = null;
  return data;
}

/** How long the shared log and the conversation get before the oldest entries go: well inside what a week may hold. */
export const LOG_LIMIT = 500;
export const MESSAGE_LIMIT = 1000;

/** The week with its log and conversation trimmed to their limits, so a long session never outgrows what a week may hold. */
export function capLogs(data: DataSlice): DataSlice {
  if (data.sync.length <= LOG_LIMIT && data.messages.length <= MESSAGE_LIMIT) return data;
  return { ...data, sync: data.sync.slice(-LOG_LIMIT), messages: data.messages.slice(-MESSAGE_LIMIT) };
}
