/** What the Garmin watch app receives and sends through /api/watch: the waiting ask, answers, the shift check-in and each shift's readings. */
import { applyResponse } from "./actions";
import { dayItems, eventsFor, isRestDay, offerImpact, waitingAsks } from "./checks";
import { EFFORT_WORD, checkInDue } from "./effort";
import { clock12, minutes, range12 } from "./logic";
import { lastReadShift, pastShifts } from "./past-shifts";
import { quietUntil } from "./quiet";
import { shiftBodyDue, shiftWindow } from "./shift-body";
import { addDays, nowIn, weekdayOf, whenWord, type Now } from "./time";
import type { DataSlice, Decision, Load, Offer, OfferStatus } from "./types";

export const WATCH_DECISIONS: Decision[] = ["accept", "decline", "later"];

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
  /** How the last shifts at this workplace went, in one line: "Last 2 at Cafe: Hard, Busy". Older builds ignore it. */
  past: string | null;
  /** Only for watch builds from before 23 Oct 2026, whose menu still lists another time and a swap. */
  alt: string;
  swap: string;
  status: "pending" | "deferred";
  /** Older builds show this after "Reminder" for an ask kept for later. There is no reminder any more. */
  reminder: string | null;
  /** When the worker is on a shift: its end ("9 pm"), so the watch stays still until then. Older builds ignore it and buzz. */
  quiet: string | null;
}

export interface WatchSummary {
  clock: string;
  ask: WatchAsk | null;
  today: string[];
  waiting: number;
  replied: { from: string; time: string; status: string } | null;
  /** A shift that just finished, for the watch to ask how the work was. Older builds ignore it. */
  checkIn: { id: string; title: string } | null;
  /** A shift that just finished, for the watch to read its heart rate and stress during: from and to in seconds since 1970. */
  shiftBody: { id: string; title: string; from: number; to: number } | null;
  /** How many shifts carry readings. With sharing off on the watch this should be 0, or the watch asks the calendar to forget again. */
  readings: number;
  /** The latest finished shift with readings, for the Last shift page, so the watch names the same shift as the calendar. Older builds ignore it. */
  lastShift: { id: string; title: string; stress: (Load | null)[]; heart: (Load | null)[] } | null;
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

/** The ask's past shifts at the same workplace, as the watch shows them. */
function pastLine(offer: Offer, data: DataSlice, now: Pick<Now, "date" | "time">): string | null {
  const shifts = pastShifts(offer, data, now);
  if (!shifts.length) return null;
  const words = shifts.map((s) => (s.effort ? EFFORT_WORD[s.effort] : "not rated"));
  return ascii(`Last${shifts.length > 1 ? ` ${shifts.length}` : ""} at ${offer.workplace.trim()}: ${words.join(", ")}`);
}

/** Today's plans for the watch's week page: start time and title, in order, without asks or rest. */
function todayLines(data: DataSlice, today: string): string[] {
  return dayItems(data, today)
    .filter((it) => it.kind !== "offer" && it.kind !== "rest")
    .slice(0, 4)
    .map((it) => ascii(`${at(it.start)} ${it.label}`));
}

/** The end of the shift the worker is on, as the watch shows it ("9 pm"), when a new ask should wait until then. */
function quietOn(offer: Offer, data: DataSlice, now: Pick<Now, "date" | "time">): string | null {
  const until = quietUntil(offer, data, now);
  return until ? ascii(clock12(until)) : null;
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
        past: pastLine(o, data, now),
        alt: "Not offered",
        swap: "No one",
        status: o.status as "pending" | "deferred",
        reminder: o.status === "deferred" ? "later" : null,
        quiet: quietOn(o, data, now),
      }
    : null;
  const last = data.offers
    .filter((x) => x.status !== "pending" && x.status !== "deferred")
    .sort((a, b) => (a.repliedAt ?? "").localeCompare(b.repliedAt ?? ""))
    .at(-1);
  const due = checkInDue(data, atTime);
  const read = shiftBodyDue(data, atTime);
  const lastRead = lastReadShift(data, now);
  const title = (s: { workplace: string; start: string; end: string }) => ascii(`${s.workplace || "Work"}, ${watchRange(s.start, s.end)}`);
  return {
    clock: now.time,
    ask,
    checkIn: due ? { id: due.id, title: title(due) } : null,
    shiftBody: read ? { id: read.id, title: title(read), ...shiftWindow(read, data.settings.timeZone) } : null,
    readings: data.shifts.filter((s) => s.body).length,
    lastShift: lastRead?.body ? { id: lastRead.id, title: title(lastRead), stress: lastRead.body.stress, heart: lastRead.body.heart } : null,
    today: todayLines(data, now.date),
    waiting: open.length,
    replied: last ? { from: ascii(last.from) || "Your manager", time: ascii(range12(last.start, last.end)), status: STATUS_WORDS[last.status] } : null,
  };
}

/** An answer chosen on the wrist changes the week exactly as the same answer on the calendar would. */
export function applyWatchAnswer(data: DataSlice, offerId: string, decision: Decision, atTime: Date = new Date()): { data: DataSlice; toast: string } | null {
  return applyResponse(data, offerId, decision, atTime);
}
