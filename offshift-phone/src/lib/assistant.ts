import { altSlots, bodyTile, buildDays, draftFor, moneySummary, offerChecks, offerWhen, replyDraft, shiftIncome, type DataState } from "./checks";
import { DAY_NAMES, DAYS, clock12, dayIndex, minutes, money, nextDay } from "./logic";
import { EMPLOYERS, PERSON, SCENARIO } from "./scenario";
import type { Day, DayItem, Decision } from "./types";

export type AssistantAction =
  | { type: "respond"; offerId: string; decision: Decision }
  | { type: "add_plan"; title: string; day: Day; start: string; end: string }
  | { type: "show_day"; day: Day };

export interface AssistantReply {
  text: string;
  actions: AssistantAction[];
}

export const BRIEF = "__brief__";
export const ANNOUNCE = "__announce__:";

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
      return `your ${it.label.replace(" · ", " ")} from ${spokenRange(it.start, it.end)}`;
    case "shift":
      return `a ${it.label.split(" · ")[0]} shift from ${spokenRange(it.start, it.end)}`;
    case "personal":
      return `${it.label.charAt(0).toLowerCase() + it.label.slice(1)} at ${clock12(it.start)}`;
    case "due":
      return `your ${it.label} at ${clock12(it.start)}`;
    default:
      return it.label;
  }
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** Everything the assistant may talk about, as plain data. */
export function assistantContext(state: DataState & { clock: string; notifications?: { title: string; body: string; at: string }[] }) {
  const days = buildDays(state);
  const today = days.find((d) => d.today)!;
  const tomorrow = days.find((d) => d.day === nextDay(SCENARIO.today));
  const pending = state.offers.filter((o) => o.status === "pending" || o.status === "deferred");
  const m = moneySummary(state);
  const body = bodyTile(state);
  return {
    person: { name: PERSON.name, pronouns: "she/her" },
    clock: state.clock,
    today: `${DAY_NAMES[SCENARIO.today]} ${SCENARIO.dates[SCENARIO.today]} ${SCENARIO.month}`,
    today_items: today.items.filter((it) => it.kind !== "offer" && it.kind !== "rest").map((it) => ({ time: it.kind === "due" ? clock12(it.start) : spokenRange(it.start, it.end), what: it.label, source: it.source })),
    tomorrow_items: tomorrow?.items.filter((it) => it.kind !== "offer" && it.kind !== "rest").map((it) => ({ time: spokenRange(it.start, it.end), what: it.label })) ?? [],
    week: days.map((d) => ({ day: d.day, items: d.items.filter((it) => it.kind !== "rest").map((it) => `${it.start}–${it.end} ${it.label}`), rest: d.rest })),
    pending_asks: pending.map((o) => {
      const emp = EMPLOYERS[o.employer];
      const checks = offerChecks(o, state);
      return {
        id: o.id,
        from: o.from,
        employer: emp.name,
        asked_at: o.sentAt,
        when: offerWhen(o),
        time: spokenRange(o.start, o.end),
        message: o.note,
        pays_about: money(shiftIncome(o)),
        checks: Object.fromEntries(checks.map((c) => [c.key, { state: c.state, text: c.text }])),
        alternative_times: altSlots(o, state).map((a) => a.label),
        possible_swap_with: emp.colleagues[1],
        status: o.status,
        reminder_at: o.reminderAt,
      };
    }),
    replied_asks: state.offers.filter((o) => o.status !== "pending" && o.status !== "deferred").map((o) => ({ from: o.from, day: o.day, time: spokenRange(o.start, o.end), status: o.status })),
    money: { essentials: money(m.essentials), earned: money(m.earned), booked: money(m.booked), covered_by: m.coveredBy ? DAY_NAMES[m.coveredBy] : null, past_essentials: money(m.past) },
    body: { label: body.label, detail: body.detail },
    protected_day: DAY_NAMES[state.settings.protectedDay],
    priority_this_month: state.settings.priority,
    unread: (state.notifications || []).slice(0, 4).map((n) => `${n.title}: ${n.body}`),
  };
}

/** The opening words when the calendar wakes up: greeting, the date, today's items, any ask. */
export function openingLines(state: DataState & { clock: string }): string[] {
  const days = buildDays(state);
  const today = days.find((d) => d.today)!;
  const items = today.items.filter((it) => it.kind !== "offer" && it.kind !== "rest");
  const pending = state.offers.filter((o) => o.status === "pending" || o.status === "deferred");
  const lines = [`${greeting(state.clock)}, ${PERSON.name}. It's ${DAY_NAMES[SCENARIO.today]} the ${SCENARIO.dates[SCENARIO.today]}th of ${SCENARIO.month}.`];
  lines.push(items.length ? `Today we have ${joinList(items.map(spokenItem))}.` : "Nothing is booked today.");
  if (pending.length) {
    const o = pending[0];
    lines.push(`${o.from} from ${EMPLOYERS[o.employer].name} has asked whether you could cover ${offerWhen(o)}, ${spokenRange(o.start, o.end)}. It's waiting for you.`);
  }
  return lines;
}

/* ---------- scripted voice, used when no Claude credentials are configured ---------- */

function briefing(state: DataState & { clock: string }): string {
  const days = buildDays(state);
  const today = days.find((d) => d.today)!;
  const items = today.items.filter((it) => it.kind !== "offer" && it.kind !== "rest");
  const pending = state.offers.filter((o) => o.status === "pending" || o.status === "deferred");
  let text = `${greeting(state.clock)}, ${PERSON.name}. `;
  text += items.length ? `Today you have ${joinList(items.map(spokenItem))}. ` : "Nothing is booked today. ";
  if (pending.length) {
    const o = pending[0];
    const emp = EMPLOYERS[o.employer];
    const checks = offerChecks(o, state);
    const flagged = checks.filter((c) => c.state !== "ok").slice(0, 2);
    text += `${o.from} from ${emp.name} asked at ${o.sentAt} whether you could cover ${offerWhen(o)}, ${spokenRange(o.start, o.end)}. `;
    text += flagged.length ? `${flagged.map((c) => c.text).join(" ")} ` : `Nothing is in the way. `;
    text += `It would add about ${money(shiftIncome(o))}. Would you like to take it, offer another time, ask for a swap, say not ${offerWhen(o)}, or decide later?`;
  } else {
    text += `No one is asking anything of you. ${DAY_NAMES[state.settings.protectedDay]} is still yours.`;
  }
  return text;
}

function announce(state: DataState & { clock: string }, offerId: string): string {
  const o = state.offers.find((x) => x.id === offerId);
  if (!o) return "";
  const emp = EMPLOYERS[o.employer];
  const flagged = offerChecks(o, state).filter((c) => c.state !== "ok")[0];
  return `${PERSON.name}, ${o.from} from ${emp.name} just asked whether you could cover ${offerWhen(o)}, ${spokenRange(o.start, o.end)}. ${flagged ? flagged.text + " " : ""}Would you like to take it, offer another time, ask for a swap, say no, or decide later?`;
}

function decide(input: string): Decision | null {
  const t = input.toLowerCase();
  if (/\b(later|remind|not now|wait|think about)\b/.test(t)) return "later";
  if (/\b(swap|someone else|cover for me|hand it)\b/.test(t)) return "swap";
  if (/\b(another time|different time|counter|instead|tomorrow|next week|other time)\b/.test(t)) return "negotiate";
  if (/\b(not tonight|not today|no thanks|decline|can't|cannot|pass|say no|turn it down|nope)\b/.test(t) || /^no\b/.test(t)) return "decline";
  if (/\b(take it|accept|yes|yeah|yep|sure|do it|i'll do it|okay take|go ahead)\b/.test(t)) return "accept";
  return null;
}

function dayFrom(input: string): Day | null {
  const t = input.toLowerCase();
  if (/\btomorrow\b/.test(t)) return nextDay(SCENARIO.today);
  if (/\btoday\b/.test(t)) return SCENARIO.today;
  for (const d of DAYS) if (new RegExp(`\\b${DAY_NAMES[d].toLowerCase()}|\\b${d.toLowerCase()}\\b`).test(t)) return d;
  return null;
}

export function scriptedTurn(input: string, state: DataState & { clock: string }): AssistantReply {
  if (input.startsWith(ANNOUNCE)) return { text: announce(state, input.slice(ANNOUNCE.length)), actions: [] };
  const namedDay = input === BRIEF ? null : dayFrom(input);
  if (namedDay && namedDay !== SCENARIO.today && /\b(what|show|on|have|anything|about)\b/i.test(input)) {
    const view = buildDays(state).find((d) => d.day === namedDay)!;
    const items = view.items.filter((it) => it.kind !== "rest");
    const text = items.length ? `${DAY_NAMES[namedDay]} has ${joinList(items.map(spokenItem))}.` : `${DAY_NAMES[namedDay]} is clear${view.rest ? ", and protected" : ""}.`;
    return { text, actions: [{ type: "show_day", day: namedDay }] };
  }
  if (input === BRIEF || /\b(brief|good (morning|afternoon|evening|day)|my day|what('s| is) on today|what('s| is) today)\b/i.test(input)) return { text: briefing(state), actions: [] };
  const pending = state.offers.filter((o) => o.status === "pending" || o.status === "deferred");
  const decision = decide(input);
  if (decision && pending.length) {
    const o = pending[0];
    const emp = EMPLOYERS[o.employer];
    const draft = decision === "later" ? null : replyDraft(o, decision, state);
    const text =
      decision === "accept"
        ? `Done. I've told ${o.from} you'll take ${offerWhen(o)}. ${draft!.after}`
        : decision === "decline"
          ? `Done. I've told ${o.from} not ${offerWhen(o)}, kindly. ${draft!.after}`
          : decision === "negotiate"
            ? `Done. I've offered ${o.from} ${altSlots(o, state)[0].label} instead. ${draft!.after}`
            : decision === "swap"
              ? `Done. I've asked ${o.from} whether ${emp.colleagues[1]} can take it. ${draft!.after}`
              : `All right. I'll remind you in half an hour. Nothing has been sent to ${o.from}.`;
    return { text, actions: [{ type: "respond", offerId: o.id, decision }] };
  }
  const day = dayFrom(input);
  if (day && /\b(what|show|on|have|anything)\b/i.test(input)) {
    const view = buildDays(state).find((d) => d.day === day)!;
    const items = view.items.filter((it) => it.kind !== "rest");
    const text = items.length ? `${DAY_NAMES[day]} has ${joinList(items.map(spokenItem))}.` : `${DAY_NAMES[day]} is clear${view.rest ? ", and protected" : ""}.`;
    return { text, actions: [{ type: "show_day", day }] };
  }
  if (pending.length) {
    const o = pending[0];
    return { text: `For ${o.from}'s ask, you can take it, offer another time, ask for a swap, say not ${offerWhen(o)}, or decide later. Which would you like?`, actions: [] };
  }
  return { text: `Nothing is waiting on you. Ask me about any day of the week, or say "brief me".`, actions: [] };
}

/** The message Offshift sends on Dinda's behalf when the assistant applies a decision. */
export function replyTextFor(state: DataState, offerId: string, decision: Decision): string {
  const o = state.offers.find((x) => x.id === offerId);
  if (!o || decision === "later") return "";
  return draftFor(replyDraft(o, decision, state), state.settings.tone);
}

export function weekdayOrder(a: Day, b: Day): number {
  return dayIndex(a) - dayIndex(b);
}
