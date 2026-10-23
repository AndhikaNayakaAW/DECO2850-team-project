/** What the Garmin watch app receives and sends through /api/watch: the waiting ask, answers and body readings. */
import { applyResponse } from "./actions";
import { BODY_SIGNALS, OVERALL_WORDS, overallLevel } from "./body";
import { dayItems, eventsFor, isRestDay, offerImpact, waitingAsks } from "./checks";
import { checkInDue } from "./effort";
import { uid } from "./ids";
import { clock12, minutes, range12 } from "./logic";
import { addDays, nowIn, weekdayOf, whenWord } from "./time";
import type { BodyLevel, BodySignals, DataSlice, Decision, Offer, OfferStatus, Wearable } from "./types";

export const WATCH_DECISIONS: Decision[] = ["accept", "decline", "later"];

export const WEARABLE_WORDS: Record<Wearable["level"], string> = OVERALL_WORDS;

const STATUS_WORDS: Record<OfferStatus, string> = {
  pending: "Waiting",
  deferred: "Kept for later",
  accepted: "Taken",
  declined: "Declined",
};

export interface WatchAsk {
  id: string;
  from: string;
  /** The workplace. Named employer so builds already on watches keep working. */
  employer: string;
  day: string;
  when: string;
  time: string;
  note: string;
  week: string[];
  /** Only for watch builds from before 23 Oct 2026, whose menu still lists another time and a swap. */
  alt: string;
  swap: string;
  status: "pending" | "deferred";
  /** Older builds show this after "Reminder" for an ask kept for later. There is no reminder any more. */
  reminder: string | null;
}

export interface WatchSummary {
  clock: string;
  ask: WatchAsk | null;
  today: string[];
  waiting: number;
  replied: { from: string; time: string; status: string } | null;
  /** A shift that just finished, for the watch to ask how the work was. Older builds ignore it. */
  checkIn: { id: string; title: string } | null;
}

/** Letters that don't split into a plain letter and an accent. */
const PLAIN: Record<string, string> = { ł: "l", Ł: "L", ø: "o", Ø: "O", ß: "ss", æ: "ae", Æ: "AE", œ: "oe", Œ: "OE", đ: "d", Đ: "D", ı: "i" };

/** Watch fonts only cover plain ASCII, so accents come off ("Zoë" reads "Zoe") and dashes, dots and quotes are flattened. */
export function ascii(s: string): string {
  return s
    .replace(/[–—]/g, "-")
    .replace(/·/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[łŁøØßæÆœŒđĐı]/g, (c) => PLAIN[c])
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** A shift's time for the watch: "4-9 pm", or "10:30 am - 12:45 pm" with room to break between the two ends. */
export function watchRange(start: string, end: string): string {
  return ascii(range12(start, end)).replace(/(am|pm)-/, "$1 - ");
}

function at(t: string): string {
  return ascii(clock12(t)).replace(" ", "");
}

/**
 * Up to three short lines for the Week check: clashes, the gap before, and the next day's start.
 * The key fact comes first, so a line that wraps on the round screen breaks in a sensible place.
 */
function weekLines(offer: Offer, data: DataSlice): string[] {
  const x = offerImpact(offer, data);
  const lines: string[] = [];
  if (isRestDay(offer.date, data.settings)) lines.push("Your rest day");
  for (const c of x.conflicts) lines.push(`${at(c.start)} clash: ${c.title}`);
  if (x.previous) {
    const gap = x.gapBefore ?? 0;
    const sameShop = x.previous.kind === "work" && x.previous.workplace?.toLowerCase() === offer.workplace.toLowerCase();
    if (sameShop && gap <= 30) lines.push(`Straight after your ${x.previous.title}`);
    else lines.push(`${gap} min after ${x.previous.title} ${at(x.previous.end)}`);
  }
  const nd = addDays(offer.date, 1);
  const first = eventsFor(data)
    .filter((e) => e.date === nd && e.viaOffer !== offer.id)
    .sort((a, b) => minutes(a.start) - minutes(b.start))[0];
  if (first) lines.push(`${weekdayOf(nd)} starts ${at(first.start)}`);
  return lines.slice(0, 3).map(ascii);
}

/** Today's plans for the watch's week page: start time and title, in order, without asks or rest. */
function todayLines(data: DataSlice, today: string): string[] {
  return dayItems(data, today)
    .filter((it) => it.kind !== "offer" && it.kind !== "rest")
    .slice(0, 4)
    .map((it) => ascii(`${at(it.start)} ${it.label}`));
}

/** Everything the watch shows, in plain text. */
export function watchSummary(data: DataSlice, atTime: Date = new Date()): WatchSummary {
  const now = nowIn(data.settings.timeZone, atTime);
  const open = waitingAsks(data.offers);
  const o = open[0];
  const ask: WatchAsk | null = o
    ? {
        id: o.id,
        from: ascii(o.from) || "Your manager",
        employer: ascii(o.workplace) || "Work",
        day: weekdayOf(o.date),
        when: ascii(whenWord(o.date, o.start, now)),
        time: watchRange(o.start, o.end),
        note: ascii(o.note),
        week: weekLines(o, data),
        alt: "Not offered",
        swap: "No one",
        status: o.status as "pending" | "deferred",
        reminder: o.status === "deferred" ? "later" : null,
      }
    : null;
  const last = data.offers
    .filter((x) => x.status !== "pending" && x.status !== "deferred")
    .sort((a, b) => (a.repliedAt ?? "").localeCompare(b.repliedAt ?? ""))
    .at(-1);
  const due = checkInDue(data, atTime);
  return {
    clock: now.time,
    ask,
    checkIn: due ? { id: due.id, title: ascii(`${due.workplace || "Work"}, ${watchRange(due.start, due.end)}`) } : null,
    today: todayLines(data, now.date),
    waiting: open.length,
    replied: last ? { from: ascii(last.from) || "Your manager", time: ascii(range12(last.start, last.end)), status: STATUS_WORDS[last.status] } : null,
  };
}

/** An answer chosen on the wrist changes the week exactly as the same answer on the calendar would. */
export function applyWatchAnswer(data: DataSlice, offerId: string, decision: Decision, atTime: Date = new Date()): { data: DataSlice; toast: string } | null {
  return applyResponse(data, offerId, decision, atTime);
}

/** Keeps an older watch build's single reading as a word, and logs it only when it changes. */
export function applyWatchBody(data: DataSlice, level: number, atTime: Date = new Date()): DataSlice {
  if (!Number.isInteger(level) || level < 0 || level > 3) return data;
  const lv = level as Wearable["level"];
  if (data.wearable && data.wearable.level === lv && !stale(data.wearable, atTime)) return data;
  const word = WEARABLE_WORDS[lv];
  const now = nowIn(data.settings.timeZone, atTime);
  if (data.wearable && data.wearable.level === lv) return { ...data, wearable: { ...data.wearable, at: now.time, receivedAt: atTime.toISOString() } };
  return {
    ...data,
    wearable: { level: lv, word, at: now.time, source: "Garmin", receivedAt: atTime.toISOString() },
    sync: [...data.sync, { id: uid("y"), at: atTime.toISOString(), from: "Watch", to: "Only you", text: `Body reading: ${word.toLowerCase()}. Kept private.` }],
  };
}

export type HealthInput = { signals: BodySignals; at: string | null } | { share: false };

/** Keeps only what the watch is allowed to send: known signals as whole levels from 0 to 3, and a clock time. */
export function parseHealth(input: unknown): HealthInput | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  if (o.share === false) return { share: false };
  const signals: BodySignals = {};
  for (const k of BODY_SIGNALS) {
    const v = o[k];
    if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 3) signals[k] = v as BodyLevel;
  }
  if (!Object.keys(signals).length) return null;
  const at = typeof o.at === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(o.at) ? o.at : null;
  return { signals, at };
}

/** Stores the watch's levels and overall word. Logs only when the overall word changes. */
export function applyWatchHealth(data: DataSlice, signals: BodySignals, at: string | null, atTime: Date = new Date()): DataSlice {
  const level = overallLevel(signals);
  if (level === null) return data;
  const ordered: BodySignals = {};
  for (const k of BODY_SIGNALS) if (signals[k] !== undefined) ordered[k] = signals[k];
  const prev = data.wearable;
  const unchanged = !!prev && prev.level === level && JSON.stringify(prev.signals ?? {}) === JSON.stringify(ordered);
  // The same reading again only needs storing now and then, to show it's still current.
  if (unchanged && !stale(prev, atTime)) return data;
  const word = OVERALL_WORDS[level];
  const wearable: Wearable = { level, word, at: at ?? nowIn(data.settings.timeZone, atTime).time, source: "Garmin", receivedAt: atTime.toISOString(), signals: ordered };
  const sync = prev?.word === word ? data.sync : [...data.sync, { id: uid("y"), at: atTime.toISOString(), from: "Watch", to: "Only you", text: `Body reading: ${word.toLowerCase()}. Kept private.` }];
  return { ...data, wearable, sync };
}

/** Sharing turned off on the watch: the calendar forgets the last reading, and the log forgets the readings too. */
export function stopWatchHealth(data: DataSlice, atTime: Date = new Date()): DataSlice {
  if (!data.wearable) return data;
  return {
    ...data,
    wearable: null,
    sync: [...data.sync.filter((e) => !(e.from === "Watch" && e.text.startsWith("Body reading"))), { id: uid("y"), at: atTime.toISOString(), from: "Watch", to: "Only you", text: "Body sharing turned off on the watch. The calendar forgot the readings." }],
  };
}

/** A stored reading older than half an hour is refreshed even when the watch reads the same. */
function stale(w: Wearable, atTime: Date): boolean {
  return !w.receivedAt || atTime.getTime() - Date.parse(w.receivedAt) > 30 * 60_000;
}
