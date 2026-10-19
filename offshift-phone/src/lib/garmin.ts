/** What the Garmin watch app receives and sends through /api/watch: the waiting ask, answers and body readings. */
import { applyResponse } from "./actions";
import { BODY_SIGNALS, OVERALL_WORDS, overallLevel } from "./body";
import { altSlots, buildDays, draftFor, eventsFor, offerImpact, offerWhen, replyDraft } from "./checks";
import { uid } from "./ids";
import { clock12, dayIndex, minutes, nextDay, range12 } from "./logic";
import { EMPLOYERS } from "./scenario";
import type { BodyLevel, BodySignals, DataSlice, Decision, Offer, OfferStatus, Wearable } from "./types";

export const WATCH_DECISIONS: Decision[] = ["accept", "negotiate", "swap", "decline", "later"];

export const WEARABLE_WORDS: Record<Wearable["level"], string> = OVERALL_WORDS;

const STATUS_WORDS: Record<OfferStatus, string> = {
  pending: "Waiting",
  deferred: "Deciding later",
  accepted: "Taken",
  declined: "Declined",
  countered: "Another time offered",
  "alt-confirmed": "Confirmed",
  "swap-requested": "Swap requested",
  swapped: "Swapped",
};

export interface WatchAsk {
  id: string;
  from: string;
  employer: string;
  day: string;
  when: string;
  time: string;
  note: string;
  week: string[];
  alt: string;
  swap: string;
  status: "pending" | "deferred";
  reminder: string | null;
}

export interface WatchSummary {
  clock: string;
  ask: WatchAsk | null;
  today: string[];
  waiting: number;
  replied: { from: string; time: string; status: string } | null;
}

/** Watch fonts only cover plain ASCII, so dashes, dots and curly quotes are flattened. */
export function ascii(s: string): string {
  return s
    .replace(/[–—]/g, "-")
    .replace(/·/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");
}

/** A shift's time for the watch: "4-9 pm", or "10:30 am - 12:45 pm" with room to break between the two ends. */
export function watchRange(start: string, end: string): string {
  return ascii(range12(start, end)).replace(/(am|pm)-/, "$1 - ");
}

function at(t: string): string {
  return ascii(clock12(t)).replace(" ", "");
}

/**
 * Up to three short lines for the Week check: clashes, the trip there, and tomorrow's start.
 * The key fact comes first, so a line that wraps on the round screen breaks in a sensible place.
 */
function weekLines(offer: Offer, data: DataSlice): string[] {
  const x = offerImpact(offer, data);
  const lines: string[] = [];
  if (offer.day === data.settings.protectedDay) lines.push("Your protected rest day");
  for (const c of x.conflicts) lines.push(`${at(c.start)} clash: ${c.title}`);
  if (x.previous) {
    const spare = x.travelBuffer ?? 0;
    if (x.travel.minutes === 0) lines.push(`Straight after your ${x.previous.title}`);
    else lines.push(spare <= 0 ? `Arrive late from ${x.previous.title} ${at(x.previous.end)}` : `${spare} min spare after ${x.previous.title} ${at(x.previous.end)}`);
  }
  const nd = nextDay(offer.day);
  if (dayIndex(nd) > dayIndex(offer.day)) {
    const first = eventsFor(data)
      .filter((e) => e.kind !== "rest" && e.day === nd)
      .sort((a, b) => minutes(a.start) - minutes(b.start))[0];
    if (first) lines.push(`${nd} starts ${at(first.start)}`);
  }
  return lines.slice(0, 3).map(ascii);
}

/** Today's plans for the watch's week page: start time and title, in order, without asks or rest. */
function todayLines(data: DataSlice): string[] {
  const today = buildDays(data).find((d) => d.today);
  if (!today) return [];
  return today.items
    .filter((it) => it.kind !== "offer" && it.kind !== "rest")
    .sort((a, b) => minutes(a.start) - minutes(b.start))
    .slice(0, 4)
    .map((it) => ascii(`${at(it.start)} ${it.label}`));
}

/** Everything the watch shows, in plain text and without money. */
export function watchSummary(data: DataSlice): WatchSummary {
  const open = data.offers.filter((o) => o.status === "pending" || o.status === "deferred");
  const o = open[0];
  const ask: WatchAsk | null = o
    ? {
        id: o.id,
        from: ascii(o.from),
        employer: ascii(EMPLOYERS[o.employer].name),
        day: o.day,
        when: ascii(offerWhen(o)),
        time: watchRange(o.start, o.end),
        note: ascii(o.note),
        week: weekLines(o, data),
        alt: ascii(altSlots(o, data)[0]?.label ?? ""),
        swap: ascii(EMPLOYERS[o.employer].colleagues[1] ?? ""),
        status: o.status as "pending" | "deferred",
        reminder: o.reminderAt ?? null,
      }
    : null;
  const last = data.offers
    .filter((x) => x.status !== "pending" && x.status !== "deferred")
    .sort((a, b) => (a.repliedAt ?? "").localeCompare(b.repliedAt ?? ""))
    .at(-1);
  return {
    clock: data.clock,
    ask,
    today: todayLines(data),
    waiting: open.length,
    replied: last ? { from: ascii(last.from), time: ascii(range12(last.start, last.end)), status: STATUS_WORDS[last.status] } : null,
  };
}

/** An answer chosen on the wrist goes out with the same drafted reply the phone would send. */
export function applyWatchAnswer(data: DataSlice, offerId: string, decision: Decision): { data: DataSlice; toast: string } | null {
  const offer = data.offers.find((o) => o.id === offerId);
  if (!offer || (offer.status !== "pending" && offer.status !== "deferred")) return null;
  const text = decision === "later" ? "" : draftFor(replyDraft(offer, decision, data), data.settings.tone);
  return applyResponse(data, offerId, decision, text, { reminderMinutes: 30 });
}

/** Keeps the watch's reading as a word, and logs it only when it changes. */
export function applyWatchBody(data: DataSlice, level: number): DataSlice {
  if (!Number.isInteger(level) || level < 0 || level > 3) return data;
  const lv = level as Wearable["level"];
  if (data.wearable && data.wearable.level === lv) return data;
  const word = WEARABLE_WORDS[lv];
  return {
    ...data,
    wearable: { level: lv, word, at: data.clock, source: "Garmin" },
    sync: [...data.sync, { id: uid("y"), at: data.clock, from: "Watch", to: "Only you", text: `Body reading: ${word.toLowerCase()}. Kept private.` }],
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
export function applyWatchHealth(data: DataSlice, signals: BodySignals, at: string | null): DataSlice {
  const level = overallLevel(signals);
  if (level === null) return data;
  const ordered: BodySignals = {};
  for (const k of BODY_SIGNALS) if (signals[k] !== undefined) ordered[k] = signals[k];
  const prev = data.wearable;
  if (prev && prev.level === level && JSON.stringify(prev.signals ?? {}) === JSON.stringify(ordered)) return data;
  const word = OVERALL_WORDS[level];
  const wearable: Wearable = { level, word, at: at ?? data.clock, source: "Garmin", signals: ordered };
  const sync = prev?.word === word ? data.sync : [...data.sync, { id: uid("y"), at: data.clock, from: "Watch", to: "Only you", text: `Body reading: ${word.toLowerCase()}. Kept private.` }];
  return { ...data, wearable, sync };
}

/** Sharing turned off on the watch: the calendar forgets the last reading. */
export function stopWatchHealth(data: DataSlice): DataSlice {
  if (!data.wearable) return data;
  return {
    ...data,
    wearable: null,
    sync: [...data.sync, { id: uid("y"), at: data.clock, from: "Watch", to: "Only you", text: "Body sharing turned off on the watch. The calendar forgot the last reading." }],
  };
}
