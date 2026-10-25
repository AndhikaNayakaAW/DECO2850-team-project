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
/** Up to a day of 15-minute blocks, each a level from 0 to 3 or no reading. */
const loads = check((v) => Array.isArray(v) && v.length >= 1 && v.length <= 96 && v.every((x) => x === null || [0, 1, 2, 3].includes(x as number)));
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

/** A shift's heart rate and stress from the watch: the same number of blocks for both. */
const shiftBody: Clean = (v) => {
  const c = object({ receivedAt: iso, stress: loads, heart: loads })(v);
  return c !== BAD && (c as { stress: unknown[] }).stress.length === (c as { heart: unknown[] }).heart.length ? c : BAD;
};
// A Fine, Tired or Wiped rating saved before 25 Oct 2026 isn't a field any more, so it drops out here.
const shift = object({ id, date, start: clock, end: clock, workplace: text(80, true), effort: optional(oneOf(["light", "steady", "busy", "hard"])), effortSkipped: optional(check((v) => typeof v === "boolean")), viaOffer: optional(id), note: optional(text(500)), body: optional(shiftBody) });
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
/** Answers saved before 23 Oct 2026, when an ask could also get another time or a swap: the worker didn't take the asked shift, unless the other time was confirmed. */
const OLD_STATUS: Record<string, string> = { countered: "declined", "swap-requested": "declined", swapped: "declined", "alt-confirmed": "accepted" };
const answered = oneOf(["pending", "deferred", "accepted", "declined"]);
const status: Clean = (v) => answered(typeof v === "string" && Object.hasOwn(OLD_STATUS, v) ? OLD_STATUS[v] : v);
const offer = object({
  id,
  from: text(40, true),
  workplace: text(80, true),
  date,
  start: clock,
  end: clock,
  note: text(1000),
  sentAt: iso,
  status,
  repliedAt: optional(iso),
});
const message = object({ id, offerId: optional(id), from: oneOf(["team", "worker"]), text: text(2000), at: iso });
const entry = object({ id, at: iso, from: text(40), to: text(40), text: text(500), offerId: optional(id) });
const settings = object({
  name: text(40),
  restDays: check((v) => Array.isArray(v) && v.length <= 7 && new Set(v).size === v.length && v.every((d) => (DAYS as string[]).includes(d))),
  protectedIds: check((v) => Array.isArray(v) && v.length <= 1000 && v.every((x) => typeof x === "string" && x.length <= 80)),
  lateFinish: clock,
  lateFinishesBeforeFlag: check((v) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 7),
  timeZone: zone,
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
});

/**
 * The week in the current shape, cleaned, or null if anything in it is malformed or its schema number is an old one.
 * The all-day readings an older version kept (wearable, bodyDays) aren't fields any more, so they drop out.
 * The keys always come back in the same order: devices compare weeks as JSON.
 */
export function cleanData(input: unknown): DataSlice | null {
  const c = week(input);
  return c === BAD ? null : (c as DataSlice);
}

/** How long the shared log and the conversation get before the oldest entries go: well inside what a week may hold. */
export const LOG_LIMIT = 500;
export const MESSAGE_LIMIT = 1000;

/** The week with its log and conversation trimmed to their limits, so a long session never outgrows what a week may hold. */
export function capLogs(data: DataSlice): DataSlice {
  if (data.sync.length <= LOG_LIMIT && data.messages.length <= MESSAGE_LIMIT) return data;
  return { ...data, sync: data.sync.slice(-LOG_LIMIT), messages: data.messages.slice(-MESSAGE_LIMIT) };
}
