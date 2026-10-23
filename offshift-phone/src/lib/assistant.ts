import { BODY_SIGNALS, SIGNAL_LABELS, bodySentence, signalWord } from "./body";
import { bodyTile, buildWeek, currentWearable, dayItems, isRestDay, offerChecks, offerWhen, waitingAsks, type DataState } from "./checks";
import { DAY_NAMES, DAYS, clock12, dayIndex, minutes } from "./logic";
import { addDays, longDate, weekdayOf, type Now } from "./time";
import type { DateKey, Day, DayItem, Decision, Offer } from "./types";

/**
 * What the assistant can do. "respond" never answers for the worker: for accept or decline the calendar opens
 * the ask and the worker presses the button themselves. Only "later", which changes nothing, applies straight away.
 */
export type AssistantAction =
  | { type: "respond"; offerId: string; decision: Decision }
  | { type: "add_plan"; title: string; date: DateKey; start: string; end: string }
  | { type: "show_day"; date: DateKey };

export interface AssistantReply {
  text: string;
  actions: AssistantAction[];
}

export const BRIEF = "__brief__";
export const ANNOUNCE = "__announce__:";
/** A chip's answer names its ask outright: `${ANSWER}${offerId}:${decision}`, so it can never land on another ask. */
export const ANSWER = "__answer__:";
const DECISIONS: Decision[] = ["accept", "decline", "later"];
/** How the assistant offers the three answers. */
const CHOICES = "accept it, decline it, or decide later";

type When = Pick<Now, "date" | "time">;

export function greeting(clock: string): string {
  const h = minutes(clock) / 60;
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function spokenRange(start: string, end: string): string {
  return `${clock12(start)} to ${clock12(end)}`;
}

function spokenItem(it: DayItem): string {
  switch (it.kind) {
    case "uni":
      return `your ${it.label.charAt(0).toLowerCase() + it.label.slice(1)} from ${spokenRange(it.start, it.end)}`;
    case "shift":
      return `a ${it.workplace ?? "work"} shift from ${spokenRange(it.start, it.end)}`;
    case "personal":
      return `${it.label.charAt(0).toLowerCase() + it.label.slice(1)} at ${clock12(it.start)}`;
    case "due":
      return `your ${it.label.charAt(0).toLowerCase() + it.label.slice(1)} at ${clock12(it.start)}`;
    default:
      return it.label;
  }
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function ordinal(n: number): string {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** "Monday the 19th of October" */
function spokenDate(date: string): string {
  const [weekday, day, month] = longDate(date).split(" ");
  return `${weekday} the ${ordinal(Number(day))} of ${month}`;
}

function pendingOf(state: DataState) {
  return waitingAsks(state.offers);
}

function nameOf(state: DataState): string {
  return state.settings.name.trim();
}


/** Everything the assistant may talk about, as plain data. */
export function assistantContext(state: DataState, now: When) {
  const week = buildWeek(state, now.date, now);
  const today = dayItems(state, now.date).filter((it) => it.kind !== "offer" && it.kind !== "rest");
  const tomorrow = dayItems(state, addDays(now.date, 1)).filter((it) => it.kind !== "offer" && it.kind !== "rest");
  const body = bodyTile(state, now);
  const watch = currentWearable(state, now);
  return {
    person: { name: nameOf(state) || null },
    clock: now.time,
    today: longDate(now.date),
    today_items: today.map((it) => ({ time: it.kind === "due" ? clock12(it.start) : spokenRange(it.start, it.end), what: it.label, source: it.source })),
    tomorrow_items: tomorrow.map((it) => ({ time: spokenRange(it.start, it.end), what: it.label })),
    week: week.map((d) => ({ day: d.day, date: d.date, items: d.items.filter((it) => it.kind !== "rest").map((it) => `${it.start}–${it.end} ${it.label}`), rest: d.rest })),
    pending_asks: pendingOf(state).map((o) => ({
      id: o.id,
      from: o.from,
      workplace: o.workplace,
      when: offerWhen(o, now),
      date: o.date,
      time: spokenRange(o.start, o.end),
      message: o.note,
      checks: Object.fromEntries(offerChecks(o, state, now).map((c) => [c.key, { state: c.state, text: c.text }])),
      status: o.status,
    })),
    replied_asks: state.offers.filter((o) => o.status !== "pending" && o.status !== "deferred").map((o) => ({ from: o.from, date: o.date, time: spokenRange(o.start, o.end), status: o.status })),
    body: {
      label: body.label,
      detail: body.detail,
      from_watch: watch?.signals ? Object.fromEntries(BODY_SIGNALS.filter((k) => watch.signals![k] !== undefined).map((k) => [SIGNAL_LABELS[k], signalWord(k, watch.signals![k]!)])) : null,
    },
    rest_days: state.settings.restDays.map((d) => DAY_NAMES[d]),
  };
}

/** The opening words when the calendar wakes up: greeting, the date, today's items, the body, any ask. */
export function openingLines(state: DataState, now: When): string[] {
  const items = dayItems(state, now.date).filter((it) => it.kind !== "offer" && it.kind !== "rest");
  const pending = pendingOf(state);
  const name = nameOf(state);
  const lines = [`${greeting(now.time)}${name ? `, ${name}` : ""}. It's ${spokenDate(now.date)}.`];
  lines.push(items.length ? `Today we have ${joinList(items.map(spokenItem))}.` : "Nothing is booked today.");
  const watch = currentWearable(state, now);
  if (watch) lines.push(bodySentence(watch));
  if (pending.length) {
    const o = pending[0];
    lines.push(`${o.from} has asked whether you could cover ${offerWhen(o, now)} at ${o.workplace}, ${spokenRange(o.start, o.end)}. It's waiting for you.`);
  }
  return lines;
}

/* ---------- scripted voice, used when no API credentials are configured ---------- */

function briefing(state: DataState, now: When): string {
  const items = dayItems(state, now.date).filter((it) => it.kind !== "offer" && it.kind !== "rest");
  const pending = pendingOf(state);
  const name = nameOf(state);
  let text = `${greeting(now.time)}${name ? `, ${name}` : ""}. `;
  text += items.length ? `Today you have ${joinList(items.map(spokenItem))}. ` : "Nothing is booked today. ";
  if (pending.length) {
    const o = pending[0];
    const flagged = offerChecks(o, state, now).filter((c) => c.state !== "ok").slice(0, 2);
    text += `${o.from} asked whether you could cover ${offerWhen(o, now)} at ${o.workplace}, ${spokenRange(o.start, o.end)}. `;
    text += flagged.length ? `${flagged.map((c) => c.text).join(" ")} ` : "Nothing is in the way. ";
    text += `Would you like to ${CHOICES}?`;
  } else {
    text += "No one is asking anything of you.";
    const rest = state.settings.restDays[0];
    if (rest) text += ` ${DAY_NAMES[rest]} is still yours.`;
  }
  return text;
}

function announce(state: DataState, offerId: string, now: When): string {
  const o = state.offers.find((x) => x.id === offerId);
  if (!o) return "";
  const flagged = offerChecks(o, state, now).filter((c) => c.state !== "ok")[0];
  const name = nameOf(state);
  return `${name ? `${name}, ` : ""}${o.from} just asked whether you could cover ${offerWhen(o, now)} at ${o.workplace}, ${spokenRange(o.start, o.end)}. ${flagged ? flagged.text + " " : ""}Would you like to ${CHOICES}?`;
}

/** Hedges mean the worker isn't sure yet, so nothing is chosen for them. */
const UNSURE = /\b(maybe|might|not sure|unsure|perhaps|dunno|don't know|do not know|i guess|kind of|sort of|hmm+)\b/;

function decide(input: string): Decision | "unsure" | null {
  // "No worries", "no problem" and "can't wait" are friendly, not a no.
  const t = input
    .toLowerCase()
    .trim()
    .replace(/\b(no worries|no problem|no prob|not a problem|can't wait|cannot wait)\b[,.!]?\s*/g, "")
    .trim();
  let d: Decision | null = null;
  if (/\byeah,? nah\b/.test(t)) d = "decline";
  else if (/\bnah,? yeah\b/.test(t)) d = "accept";
  else if (/\b(later|remind|not now|let me think|think about it|give me a (minute|moment|bit))\b/.test(t)) d = "later";
  else if (/^(no|nope|nah|not)\b/.test(t) || /\b(not tonight|not today|not tomorrow|no thanks|decline|can't|cannot|pass|say no|turn it down)\b/.test(t) || /\b(don't|dont|do not|won't|will not)\b[^.!?]*\b(take|accept|do|want)\b/.test(t)) d = "decline";
  else if (/\b(take it|accept|yes|yeah|yep|sure|do it|i'll do it|okay take|go ahead)\b/.test(t)) d = "accept";
  if (d && d !== "later" && UNSURE.test(t)) return "unsure";
  return d;
}

/** "tomorrow", "today", or a weekday: the next one, counting today. */
function dateFrom(input: string, now: When): DateKey | null {
  const t = input.toLowerCase();
  if (/\btomorrow\b/.test(t)) return addDays(now.date, 1);
  if (/\btoday\b|\btonight\b/.test(t)) return now.date;
  for (const d of DAYS) {
    if (new RegExp(`\\b${DAY_NAMES[d].toLowerCase()}|\\b${d.toLowerCase()}\\b`).test(t)) {
      for (let i = 0; i < 7; i++) if (weekdayOf(addDays(now.date, i)) === d) return addDays(now.date, i);
    }
  }
  return null;
}

function describeDay(state: DataState, date: DateKey): string {
  const name = DAY_NAMES[weekdayOf(date)];
  const items = dayItems(state, date).filter((it) => it.kind !== "rest");
  return items.length ? `${name} has ${joinList(items.map(spokenItem))}.` : `${name} is clear${isRestDay(date, state.settings) ? ", and kept for rest" : ""}.`;
}

/** What the assistant says when it opens the ask for an answer (or, for later, keeps it on the week). */
function answerReply(o: Offer, decision: Decision, now: When): AssistantReply {
  const when = offerWhen(o, now);
  const text =
    decision === "accept"
      ? `I've opened ${o.from}'s ask for ${when}. Press Accept to add it to your week.`
      : decision === "decline"
        ? `I've opened ${o.from}'s ask for ${when}. Press Decline to take it off your week.`
        : `All right. It stays on your week, see-through, until you press it. Nothing was sent to ${o.from}.`;
  return { text, actions: [{ type: "respond", offerId: o.id, decision }] };
}

export function scriptedTurn(input: string, state: DataState, now: When): AssistantReply {
  if (input.startsWith(ANNOUNCE)) return { text: announce(state, input.slice(ANNOUNCE.length), now), actions: [] };
  const pending = pendingOf(state);
  if (input.startsWith(ANSWER)) {
    const [id, decision] = input.slice(ANSWER.length).split(":");
    const o = pending.find((x) => x.id === id);
    if (o && DECISIONS.includes(decision as Decision)) return answerReply(o, decision as Decision, now);
    return { text: "That ask has already been answered.", actions: [] };
  }
  const named = input === BRIEF ? null : dateFrom(input, now);
  const decision = input === BRIEF ? null : decide(input);
  if (!decision && named && named !== now.date && /\b(what|show|on|have|anything|about)\b/i.test(input)) {
    return { text: describeDay(state, named), actions: [{ type: "show_day", date: named }] };
  }
  if (input === BRIEF || /\b(brief|good (morning|afternoon|evening|day)|my day|what('s| is) on today|what('s| is) today)\b/i.test(input)) return { text: briefing(state, now), actions: [] };
  if (decision && pending.length) {
    // The ask the worker named: by its own words ("tonight", "Thu 5 Nov"), else by the day. Never a guess between two.
    const lower = input.toLowerCase();
    const byWords = pending.filter((x) => lower.includes(offerWhen(x, now).toLowerCase()));
    let o: Offer | undefined = byWords.length === 1 ? byWords[0] : undefined;
    if (!o && named) o = pending.find((x) => x.date === named);
    if (!o && pending.length > 1 && (named || byWords.length > 1)) {
      return { text: `Which ask do you mean? ${joinList(pending.map((x) => `${x.from} for ${offerWhen(x, now)}`))}.`, actions: [] };
    }
    o ??= pending[0];
    if (decision === "unsure") {
      return { text: `That's okay, there's no rush. You can ${CHOICES}. Which would you like?`, actions: [] };
    }
    return answerReply(o, decision, now);
  }
  if (named && /\b(what|show|on|have|anything)\b/i.test(input)) return { text: describeDay(state, named), actions: [{ type: "show_day", date: named }] };
  if (pending.length) {
    const o = pending[0];
    return { text: `For ${o.from}'s ask, you can ${CHOICES}. Which would you like?`, actions: [] };
  }
  return { text: `Nothing is waiting on you. Ask me about any day this week, or say "brief me".`, actions: [] };
}

export function weekdayOrder(a: Day, b: Day): number {
  return dayIndex(a) - dayIndex(b);
}
