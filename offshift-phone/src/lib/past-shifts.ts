/**
 * How the worker's last shifts at the same workplace went, for a new ask: their own work ratings and what their
 * watch read during those shifts. Shown beside the ask as facts, never as advice or a verdict.
 * Rationale and sources: docs/design/2026-10-25-biometrics-during-shifts.md.
 */
import { EFFORT_WORD } from "./effort";
import { minutes } from "./logic";
import { positionsOf, wherePhrase } from "./shift-body";
import { addDays, stamp, type Now } from "./time";
import type { Check, DataSlice, Offer, Shift } from "./types";

type When = Pick<Now, "date" | "time">;

/** Enough to see a pattern on a narrow panel and on the watch. */
const LIMIT = 4;
const NUM = ["no", "one", "two", "three", "four"];

function samePlace(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function ended(shift: Shift, now: When): boolean {
  const endDate = minutes(shift.end) <= minutes(shift.start) ? addDays(shift.date, 1) : shift.date;
  return stamp(endDate, shift.end) <= stamp(now.date, now.time);
}

function joinAnd(parts: string[]): string {
  return parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * The worker's finished shifts at the ask's workplace that have something to show (a rating or the watch's readings),
 * most recent first. The shift booked from this same ask isn't a past shift of it.
 */
export function pastShifts(offer: Pick<Offer, "id" | "workplace">, data: Pick<DataSlice, "shifts">, now: When, limit = LIMIT): Shift[] {
  return data.shifts
    .filter((s) => samePlace(s.workplace, offer.workplace) && s.viaOffer !== offer.id && (s.effort || s.body) && ended(s, now))
    .sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`))
    .slice(0, limit);
}

/** How often the watch read high stress during those shifts, and when in the shift it mostly was. */
function stressSentence(shifts: Shift[]): string {
  const read = shifts.filter((s) => s.body?.stress.some((v) => v !== null));
  const b = read.length;
  if (!b) return "";
  const n = shifts.length;
  const high = read.filter((s) => s.body!.stress.includes(3));
  const k = high.length;
  const where = wherePhrase(high.flatMap((s) => positionsOf(s.body!.stress, 3)));
  const tail = where ? `, mostly ${where}` : "";
  if (b === n) {
    if (!k) return ` Your watch read no high stress during ${n === 1 ? "it" : "them"}.`;
    const which = n === 1 ? "during it" : k === n ? (n === 2 ? "in both" : `in all ${NUM[n]}`) : `in ${NUM[k]} of them`;
    return ` Your watch read high stress ${which}${tail}.`;
  }
  if (!k) return ` Your watch read ${NUM[b]} of them, with no high stress.`;
  const which = k === b ? (b === 1 ? "" : b === 2 ? " in both" : ` in all ${NUM[b]}`) : ` in ${NUM[k]}`;
  return ` Your watch read ${NUM[b]} of them, with high stress${which}${tail}.`;
}

/** The third check on an ask: the last shifts at the same workplace, in the worker's own words and the watch's. */
export function pastCheck(offer: Offer, data: Pick<DataSlice, "shifts">, now: When): Check {
  const place = offer.workplace.trim();
  const shifts = pastShifts(offer, data, now);
  if (!shifts.length) return { key: "past", state: "info", text: `Nothing to compare yet. Rate your shifts at ${place} on your watch and they show here.` };
  const n = shifts.length;
  const rated = shifts.filter((s) => s.effort).map((s) => EFFORT_WORD[s.effort!]);
  const unrated = n - rated.length;
  const lead = n === 1 ? `Your last shift at ${place}` : `Your last ${NUM[n]} shifts at ${place}`;
  const ratings = !rated.length ? `you didn't rate ${n === 1 ? "it" : "them"}` : unrated ? `${joinAnd(rated)}, and ${NUM[unrated]} you didn't rate` : joinAnd(rated);
  return { key: "past", state: "info", text: `${lead}: ${ratings}.${stressSentence(shifts)}` };
}
