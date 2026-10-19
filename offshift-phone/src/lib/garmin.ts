/** What the Garmin watch app receives and sends through /api/watch: the waiting ask, answers and body readings. */
import { applyResponse } from "./actions";
import { altSlots, draftFor, eventsFor, offerImpact, offerWhen, replyDraft } from "./checks";
import { uid } from "./ids";
import { clock12, dayIndex, minutes, nextDay, range12 } from "./logic";
import { EMPLOYERS } from "./scenario";
import type { DataSlice, Decision, Offer, OfferStatus, Wearable } from "./types";

export const WATCH_DECISIONS: Decision[] = ["accept", "negotiate", "swap", "decline", "later"];

export const WEARABLE_WORDS: Record<Wearable["level"], string> = {
  0: "Very low",
  1: "Running low",
  2: "Steady",
  3: "Plenty of energy",
};

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

function at(t: string): string {
  return ascii(clock12(t)).replace(" ", "");
}

/** Up to three short lines for the Week check: clashes, the trip there, and tomorrow's start. */
function weekLines(offer: Offer, data: DataSlice): string[] {
  const x = offerImpact(offer, data);
  const lines: string[] = [];
  if (offer.day === data.settings.protectedDay) lines.push("Your protected rest day");
  for (const c of x.conflicts) lines.push(`Clash: ${c.title} ${at(c.start)}`);
  if (x.previous) {
    const spare = x.travelBuffer ?? 0;
    if (x.travel.minutes === 0) lines.push(`Straight after your ${x.previous.title}`);
    else lines.push(spare <= 0 ? `After ${x.previous.title} ${at(x.previous.end)}: arrive late` : `After ${x.previous.title} ${at(x.previous.end)}: ${spare} min spare`);
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
        time: ascii(range12(o.start, o.end)),
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
