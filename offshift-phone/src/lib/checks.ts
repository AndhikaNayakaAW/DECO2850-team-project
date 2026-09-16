import {
  DAYS,
  DAY_NAMES,
  absMinutes,
  clock12,
  dayIndex,
  duration,
  fromMinutes,
  income,
  minutes,
  money,
  nextDay,
  range12,
  shiftImpact,
} from "./logic";
import { EMPLOYERS, SCENARIO } from "./scenario";
import type {
  AltSlot,
  BodyRating,
  Check,
  CheckState,
  Day,
  DayItem,
  DayView,
  Decision,
  ImpactTile,
  Offer,
  PersonalEvent,
  Settings,
  Shift,
  Tone,
  UniEvent,
} from "./types";

export interface DataState {
  shifts: Shift[];
  uni: UniEvent[];
  personal: PersonalEvent[];
  offers: Offer[];
  settings: Settings;
}

interface Ev {
  id: string;
  day: Day;
  start: string;
  end: string;
  title: string;
  kind: "work" | "study" | "personal" | "rest";
  source: string;
  employer?: Shift["employer"];
  /** how the event reads mid-sentence: "tute", "Pandora shift", "dinner with Ayu" */
  phrase: string;
}

const RATED_WORD: Record<BodyRating, string> = { fine: "Fine", tired: "Tired", wiped: "Wiped" };
const ORD = ["first", "second", "third", "fourth", "fifth"];
const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven"];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function lcFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function shiftRate(shift: { employer: Shift["employer"]; day: Day }): number {
  const emp = EMPLOYERS[shift.employer];
  return shift.day === "Sat" ? emp.satRate : emp.rate;
}

export function shiftIncome(shift: { employer: Shift["employer"]; day: Day; start: string; end: string; break?: number }): number {
  return income(shift, shiftRate(shift));
}

export function isClose(shift: { employer: Shift["employer"]; end: string }): boolean {
  return minutes(shift.end) >= EMPLOYERS[shift.employer].closeHour * 60;
}

export function shiftLabel(shift: Shift): string {
  const emp = EMPLOYERS[shift.employer];
  const hrs = (minutes(shift.end) - minutes(shift.start)) / 60;
  const tag = isClose(shift) ? "close" : shift.day === "Sat" ? "Sat rate" : `${hrs % 1 ? hrs.toFixed(1) : hrs}h`;
  return `${emp.name} · ${tag}`;
}

/** Every commitment Offshift can see, flattened for the impact maths. */
export function eventsFor(state: DataState, excludeOfferId?: string): Ev[] {
  const out: Ev[] = [];
  state.shifts.forEach((s) =>
    out.push({
      id: s.id,
      day: s.day,
      start: s.start,
      end: s.end,
      title: `${EMPLOYERS[s.employer].name} shift`,
      phrase: `${EMPLOYERS[s.employer].name} shift`,
      kind: "work",
      source: EMPLOYERS[s.employer].workerApp,
      employer: s.employer,
    }),
  );
  state.uni
    .filter((u) => u.type !== "due")
    .forEach((u) => out.push({ id: u.id, day: u.day, start: u.start, end: u.end, title: u.title, phrase: u.title.toLowerCase(), kind: "study", source: "myUQ" }));
  state.personal.forEach((p) => out.push({ id: p.id, day: p.day, start: p.start, end: p.end, title: p.title, phrase: lcFirst(p.title), kind: "personal", source: "Calendar" }));
  out.push({ id: "rest", day: state.settings.protectedDay, start: "00:00", end: "23:59", title: "Protected rest", phrase: "protected rest", kind: "rest", source: "Offshift" });
  void excludeOfferId;
  return out;
}

function travelFor(prev: Ev | null, settings: Settings, employer: Shift["employer"]): { minutes: number; via: string } {
  if (!prev) return { minutes: 25, via: "From home it" };
  if (prev.kind === "study") return { minutes: settings.travelFromUniMin, via: `The ${settings.travelRoute}` };
  if (prev.kind === "work" && prev.employer === employer) return { minutes: 0, via: "Same shop, so it" };
  return { minutes: 20, via: "Getting there" };
}

export function offerImpact(offer: Offer, state: DataState) {
  const events = eventsFor(state, offer.id).filter((e) => e.kind !== "rest");
  const prevCandidates = events.filter((e) => e.day === offer.day && minutes(e.end) <= minutes(offer.start));
  const prev = prevCandidates.sort((a, b) => minutes(b.end) - minutes(a.end))[0] || null;
  const travel = travelFor(prev, state.settings, offer.employer);
  const impact = shiftImpact({ day: offer.day, start: offer.start, end: offer.end, travel: travel.minutes }, events);
  return { ...impact, travel };
}

/* ---------- week view ---------- */

export function buildDays(state: DataState): DayView[] {
  return DAYS.map((day) => {
    const items: DayItem[] = [];
    state.uni
      .filter((u) => u.day === day)
      .forEach((u) =>
        items.push({
          id: u.id,
          kind: u.type === "due" ? "due" : "uni",
          start: u.start,
          end: u.end,
          label: u.type === "due" ? `${u.course} ${u.title.toLowerCase()}` : `${u.title} · ${u.course}`,
          source: "myUQ",
          protected: (state.settings.protectedIds || []).includes(u.id),
          status: (state.settings.protectedIds || []).includes(u.id) ? "Timetabled · Protected by you" : "Timetabled",
        }),
      );
    state.shifts
      .filter((s) => s.day === day)
      .forEach((s) =>
        items.push({
          id: s.id,
          kind: "shift",
          start: s.start,
          end: s.end,
          label: shiftLabel(s),
          source: EMPLOYERS[s.employer].workerApp,
          employer: s.employer,
          warn: s.rated && s.rated !== "fine" ? `rated ${RATED_WORD[s.rated]}` : undefined,
          protected: (state.settings.protectedIds || []).includes(s.id),
          status: (state.settings.protectedIds || []).includes(s.id) ? "Rostered · Protected by you" : s.viaOffer ? "Rostered · added today" : "Rostered",
        }),
      );
    state.offers
      .filter((o) => o.day === day && (o.status === "pending" || o.status === "deferred"))
      .forEach((o) =>
        items.push({
          id: o.id,
          kind: "offer",
          start: o.start,
          end: o.end,
          label: `Offer from ${o.from} · ${isClose(o) ? "close" : `${(minutes(o.end) - minutes(o.start)) / 60}h`}`,
          source: EMPLOYERS[o.employer].workerApp,
          employer: o.employer,
          offerId: o.id,
          status: o.status === "deferred" ? `Pending · reminder ${o.reminderAt}` : "Pending · waiting on you",
        }),
      );
    const protectedIds = state.settings.protectedIds || [];
    state.personal
      .filter((p) => p.day === day)
      .forEach((p) =>
        items.push({
          id: p.id,
          kind: "personal",
          start: p.start,
          end: p.end,
          label: p.title,
          source: "Calendar",
          category: p.category || "personal",
          importance: p.importance || "flexible",
          protected: p.importance === "protected" || protectedIds.includes(p.id),
          status: p.importance === "protected" || protectedIds.includes(p.id) ? "Protected by you" : p.importance === "important" ? "Important" : "Flexible",
        }),
      );
    items.sort((a, b) => minutes(a.start) - minutes(b.start));
    const rest = day === state.settings.protectedDay;
    if (rest && !items.length) items.push({ id: `rest-${day}`, kind: "rest", start: "00:00", end: "23:59", label: "Rest. Booked like a shift.", source: "Offshift", status: "Protected rest" });
    return { day, date: SCENARIO.dates[day], today: day === SCENARIO.today, rest, items };
  });
}

/* ---------- money ---------- */

export function moneySummary(state: DataState) {
  const todayIdx = dayIndex(SCENARIO.today);
  const ess = state.settings.essentials;
  let cum = state.settings.lastWeekEarned;
  let coveredBy: Day | null = cum >= ess ? "Mon" : null;
  let earned = state.settings.lastWeekEarned;
  let booked = 0;
  DAYS.forEach((day) => {
    const dayTotal = state.shifts.filter((s) => s.day === day).reduce((sum, s) => sum + shiftIncome(s), 0);
    cum += dayTotal;
    if (dayIndex(day) < todayIdx) earned += dayTotal;
    else booked += dayTotal;
    if (!coveredBy && cum >= ess) coveredBy = day;
  });
  const total = earned + booked;
  return {
    essentials: ess,
    earned: Math.round(earned),
    booked: Math.round(booked),
    total: Math.round(total),
    coveredBy,
    past: Math.round(total - ess),
    short: Math.max(0, Math.round(ess - total)),
    earnedPct: Math.min(100, Math.round((earned / ess) * 100)),
    bookedPct: Math.max(0, Math.min(100 - Math.min(100, Math.round((earned / ess) * 100)), Math.round((booked / ess) * 100))),
  };
}

/* ---------- body tile ---------- */

export function bodyTile(state: DataState): { state: CheckState; label: string; detail: string } {
  const todayIdx = dayIndex(SCENARIO.today);
  const last = state.shifts
    .filter((s) => s.rated && dayIndex(s.day) < todayIdx)
    .sort((a, b) => dayIndex(b.day) - dayIndex(a.day))[0];
  const early = eventsFor(state)
    .filter((e) => e.kind !== "rest" && dayIndex(e.day) > todayIdx && minutes(e.start) <= 10 * 60)
    .reduce((set, e) => set.add(e.day), new Set<Day>()).size;
  const earlyLine = early ? ` ${cap(NUM[early] || String(early))} early start${early === 1 ? "" : "s"} ahead.` : "";
  if (!last) return { state: "ok", label: "No check-ins yet", detail: `Rate a shift after you clock off.${earlyLine}` };
  const what = isClose(last) ? "close" : "shift";
  const detail = `${DAY_NAMES[last.day]}'s ${what} rated ${RATED_WORD[last.rated!]}.${earlyLine}`;
  if (last.rated === "wiped") return { state: "bad", label: "Running on empty", detail };
  if (last.rated === "tired") return { state: "warn", label: "Getting tired", detail };
  return { state: "ok", label: "Doing okay", detail };
}

/* ---------- the three checks ---------- */

function whenWord(offer: Offer): string {
  if (offer.day === SCENARIO.today) return minutes(offer.start) >= 16 * 60 ? "tonight" : "today";
  if (offer.day === nextDay(SCENARIO.today)) return "tomorrow";
  return DAY_NAMES[offer.day];
}

function dayWord(offer: Offer): string {
  if (offer.day === SCENARIO.today) return minutes(offer.start) >= 16 * 60 ? "Tonight" : "Today";
  if (offer.day === nextDay(SCENARIO.today)) return "Tomorrow";
  return DAY_NAMES[offer.day];
}

function nextDayLine(offer: Offer, state: DataState): string {
  const nd = nextDay(offer.day);
  if (dayIndex(nd) <= dayIndex(offer.day)) return "";
  const first = eventsFor(state)
    .filter((e) => e.kind !== "rest" && e.day === nd)
    .sort((a, b) => minutes(a.start) - minutes(b.start))[0];
  if (!first) return "";
  return `${DAY_NAMES[nd]} starts at ${clock12(first.start)}`;
}

export function bodyCheck(offer: Offer, state: DataState): Check {
  const s = state.settings;
  if (offer.day === s.protectedDay) {
    return {
      key: "body",
      state: "bad",
      text: `${DAY_NAMES[offer.day]} is your protected rest day. You booked it like a shift so nothing lands on it. Giving it away is your call, but it is the one day this week with nothing in it.`,
    };
  }
  const idx = dayIndex(offer.day);
  const recent = state.shifts.filter((sh) => dayIndex(sh.day) >= idx - 2 && dayIndex(sh.day) <= idx);
  const recentCloses = recent.filter(isClose).sort((a, b) => dayIndex(a.day) - dayIndex(b.day));
  const closes = recentCloses.length + (isClose(offer) ? 1 : 0);
  const last = state.shifts
    .filter((sh) => sh.rated && dayIndex(sh.day) < idx)
    .sort((a, b) => dayIndex(b.day) - dayIndex(a.day))[0];
  const heavy = recent
    .filter((sh) => sh.rated && sh.rated !== "fine" && dayIndex(sh.day) < idx)
    .sort((a, b) => dayIndex(b.day) - dayIndex(a.day))[0];
  const next = nextDayLine(offer, state);
  const span = recentCloses.length ? idx - dayIndex(recentCloses[0].day) + 1 : 1;
  const legs = heavy ? `${DAY_NAMES[heavy.day]}'s ${isClose(heavy) ? "close" : "shift"} is still in your legs. You rated it ${RATED_WORD[heavy.rated!]}. ` : "";
  if (closes >= s.closesBeforeFlag && isClose(offer)) {
    return {
      key: "body",
      state: "warn",
      text: `${legs}${dayWord(offer)} would be your ${ORD[closes - 1] || `${closes}th`} close in ${NUM[span] || span} days${next ? `, and ${next}` : ""}.`,
    };
  }
  const sameDay = state.shifts.filter((sh) => sh.day === offer.day);
  const dayHours = (sameDay.reduce((sum, sh) => sum + minutes(sh.end) - minutes(sh.start), 0) + minutes(offer.end) - minutes(offer.start)) / 60;
  if (sameDay.length && dayHours >= 9) {
    return {
      key: "body",
      state: "warn",
      text: `${legs}With your ${range12(sameDay[0].start, sameDay[0].end)} shift that's ${dayHours % 1 ? dayHours.toFixed(1) : dayHours} hours on your feet ${dayWord(offer).toLowerCase()}${next ? `, and ${next}` : ""}.`,
    };
  }
  if (last && last.rated === "wiped") {
    return { key: "body", state: "warn", text: `You rated ${DAY_NAMES[last.day]}'s shift Wiped. ${dayWord(offer)} is not a close, but that is worth remembering${next ? `. ${cap(next)}` : ""}.` };
  }
  return {
    key: "body",
    state: "ok",
    text: `Nothing heavy in the days around this.${last ? ` ${DAY_NAMES[last.day]}'s shift you rated ${RATED_WORD[last.rated!]}.` : ""}${next ? ` ${cap(next)}.` : ""}`,
  };
}

export function weekCheck(offer: Offer, state: DataState): Check {
  const s = state.settings;
  const x = offerImpact(offer, state);
  const dues = state.uni.filter((u) => u.type === "due" && (u.day === offer.day || u.day === nextDay(offer.day)));
  const dueLine = dues.length ? ` ${dues[0].course} ${dues[0].title.toLowerCase()} ${dues[0].day === offer.day ? `${dayWord(offer).toLowerCase()} at ${clock12(dues[0].start)}` : `${DAY_NAMES[dues[0].day]} night`}.` : "";
  if (offer.day === s.protectedDay) {
    const shifts = state.shifts.length;
    const uni = state.uni.filter((u) => u.type !== "due").length;
    return { key: "week", state: dues.length ? "warn" : "ok", text: `Nothing else is on ${DAY_NAMES[offer.day]}, because you booked rest. The week around it holds ${NUM[shifts] || shifts} shifts and ${NUM[uni] || uni} uni sessions.${dueLine}` };
  }
  let travelSentence = "";
  let straightOn = false;
  if (x.previous && x.travel.minutes === 0) {
    const gap = minutes(offer.start) - minutes(x.previous.end);
    const hours = (minutes(x.previous.end) - minutes(x.previous.start) + minutes(offer.end) - minutes(offer.start)) / 60;
    straightOn = gap <= 30;
    travelSentence = straightOn
      ? ` Runs straight on from your ${range12(x.previous.start, x.previous.end)} shift: ${hours % 1 ? hours.toFixed(1) : hours} hours in one day.`
      : ` Your ${range12(x.previous.start, x.previous.end)} shift is at the same shop, with ${gap} minutes between.`;
  } else if (x.previous) {
    const arrive = fromMinutes(minutes(x.previous.end) + x.travel.minutes);
    const buffer = x.travelBuffer ?? 0;
    const spare = buffer <= 0 ? "which is after it starts" : buffer < 20 ? "with no time to eat" : `with ${buffer} minutes to spare`;
    travelSentence = ` ${cap(x.previous.phrase)} ends ${clock12(x.previous.end)}. ${x.travel.via} takes about ${x.travel.minutes} minutes, so you'd arrive around ${clock12(arrive)}, ${spare}.`;
  }
  if (x.conflicts.length) {
    const c = x.conflicts[0];
    return { key: "week", state: "bad", text: `Overlaps ${c.phrase}, ${range12(c.start, c.end)} (${c.source}).${travelSentence}${dueLine}` };
  }
  if (straightOn || (x.travelBuffer !== null && x.travelBuffer < 30 && x.travel.minutes > 0)) {
    return { key: "week", state: "warn", text: `${travelSentence.trim()}${dueLine}` };
  }
  return { key: "week", state: dues.length ? "warn" : "ok", text: `${x.previous ? travelSentence.trim() : `Nothing else on ${dayWord(offer).toLowerCase()} before it.`}${dueLine}` };
}

export function moneyCheck(offer: Offer, state: DataState): Check {
  const m = moneySummary(state);
  const add = shiftIncome(offer);
  if (m.coveredBy) {
    return {
      key: "money",
      state: "ok",
      text: `This fortnight's essentials (${money(m.essentials)}) are covered by ${DAY_NAMES[m.coveredBy]}. ${dayWord(offer)} adds about ${money(add)} on top.`,
    };
  }
  return {
    key: "money",
    state: "warn",
    text: `Essentials (${money(m.essentials)}) aren't covered yet: ${money(m.short)} short after booked shifts. ${dayWord(offer)} would add about ${money(add)}.`,
  };
}

const CHECK_ORDER: Record<Settings["priority"], Check["key"][]> = {
  health: ["body", "week", "money"],
  uni: ["week", "body", "money"],
  money: ["money", "body", "week"],
};

export function offerChecks(offer: Offer, state: DataState): Check[] {
  const all: Record<Check["key"], Check> = {
    body: bodyCheck(offer, state),
    week: weekCheck(offer, state),
    money: moneyCheck(offer, state),
  };
  return CHECK_ORDER[state.settings.priority].map((k) => all[k]);
}

export function impactTiles(offer: Offer, state: DataState): ImpactTile[] {
  const x = offerImpact(offer, state);
  const study = x.conflicts.filter((c) => c.kind === "study");
  const personal = x.conflicts.filter((c) => c.kind === "personal");
  const due = state.uni.find((u) => u.type === "due" && (u.day === offer.day || u.day === nextDay(offer.day)));
  const add = shiftIncome(offer);
  return [
    {
      key: "study",
      title: "Study",
      value: study.length ? `Overlap: ${study[0].title}` : due ? `${due.title} ${DAY_NAMES[due.day]}` : "No direct overlap",
      detail: study.length ? "Review the class before replying" : due ? `${due.course}, due ${clock12(due.start)}` : "No class in the shift window",
      state: study.length ? "bad" : due ? "warn" : "ok",
    },
    {
      key: "travel",
      title: "Travel",
      value: `${x.travel.minutes} min estimated`,
      detail: x.travelBuffer === null ? "From home, nothing before it" : x.travel.minutes === 0 ? `Straight after your ${x.previous?.phrase}` : `${Math.max(0, x.travelBuffer)} min buffer after ${x.previous?.phrase}`,
      state: x.travelBuffer !== null && x.travelBuffer < 30 && x.travel.minutes > 0 ? "warn" : "ok",
    },
    {
      key: "income",
      title: "Income",
      value: `Approx. ${money(add)}`,
      detail: `${duration(x.paidMinutes)} paid · $${shiftRate(offer)}/h`,
      state: "ok",
    },
    {
      key: "rest",
      title: "Rest",
      value: duration(x.restMinutes),
      detail: x.restMinutes === null ? "No next commitment" : x.next!.day === offer.day ? `before ${x.next!.phrase}` : `before ${DAY_NAMES[x.next!.day]}'s ${x.next!.phrase}`,
      state: x.restMinutes !== null && x.restMinutes < 600 ? "warn" : "ok",
    },
    {
      key: "personal",
      title: "Personal",
      value: personal.length ? `Overlap: ${personal[0].title}` : "Plans stay visible",
      detail: personal.length ? "Your call. A note to them can be drafted." : "No category is ranked for you",
      state: personal.length ? "bad" : "ok",
    },
  ];
}

/* ---------- alternatives ---------- */

export function altSlots(offer: Offer, state: DataState): AltSlot[] {
  const out: AltSlot[] = [];
  const events = eventsFor(state).filter((e) => e.kind !== "rest");
  const nd = nextDay(offer.day);
  const emp = EMPLOYERS[offer.employer];
  if (dayIndex(nd) > dayIndex(offer.day) && nd !== state.settings.protectedDay) {
    const first = events.filter((e) => e.day === nd).sort((a, b) => minutes(a.start) - minutes(b.start))[0];
    const end = first ? first.start : "12:00";
    if (minutes(end) - 8 * 60 >= 120) out.push({ day: nd, start: "08:00", end, label: `${nd} ${range12("08:00", end)}` });
  }
  DAYS.filter((d) => dayIndex(d) > dayIndex(offer.day) && d !== state.settings.protectedDay).forEach((d) => {
    const evening = events.filter((e) => e.day === d && minutes(e.end) > 16 * 60);
    if (!evening.length && out.length < 2) {
      const end = fromMinutes(emp.closeHour * 60);
      out.push({ day: d, start: "16:00", end, label: `${d} ${range12("16:00", end)}` });
    }
  });
  out.push({ day: offer.day, start: offer.start, end: offer.end, label: `Next ${DAY_NAMES[offer.day]} ${range12(offer.start, offer.end)}`, nextWeek: true });
  return out.slice(0, 3);
}

/* ---------- reply drafts ---------- */

export interface Draft {
  title: string;
  warm: string;
  plain: string;
  note: string;
  after: string;
}

function wellWish(offer: Offer): { warm: string; plain: string } {
  const m = /(\w+)'s (?:sick|unwell|off sick)/i.exec(offer.note);
  if (m) return { warm: ` Hope ${m[1]} feels better soon.`, plain: ` Hope ${m[1]}'s okay.` };
  if (/sick|unwell/i.test(offer.note)) return { warm: " Hope they feel better soon.", plain: " Hope they're okay." };
  return { warm: "", plain: "" };
}

function reason(offer: Offer, state: DataState): { warm: string; plain: string } {
  const checks = offerChecks(offer, state);
  const body = checks.find((c) => c.key === "body")!;
  const week = checks.find((c) => c.key === "week")!;
  if (offer.day === state.settings.protectedDay) return { warm: `${DAY_NAMES[offer.day]}'s my rest day and I try to keep it clear.`, plain: `${DAY_NAMES[offer.day]}'s my day off.` };
  const ordered = checks.filter((c) => c.state !== "ok");
  const first = ordered[0];
  if (first?.key === "body" && body.state !== "ok") return { warm: "I've had a couple of long days and I need a proper night's rest.", plain: "I need the rest." };
  if (first?.key === "week" && week.state === "bad") {
    const x = offerImpact(offer, state);
    const c = x.conflicts[0];
    return { warm: c ? `I've got ${c.phrase} that I can't move.` : "I've got plans I can't move.", plain: "I've got plans I can't move." };
  }
  if (first?.key === "week") return { warm: "It's too tight after uni to make it work properly.", plain: "It doesn't work with uni today." };
  return { warm: "It doesn't work for me this time.", plain: "It doesn't work this time." };
}

export function replyDraft(offer: Offer, decision: Decision, state: DataState, opts: { alt?: AltSlot; colleague?: string } = {}): Draft {
  const emp = EMPLOYERS[offer.employer];
  const m = emp.manager.name;
  const when = whenWord(offer);
  const dayW = dayWord(offer);
  const wish = wellWish(offer);
  const x = offerImpact(offer, state);
  const protectedDay = DAY_NAMES[state.settings.protectedDay];
  const next = nextDayLine(offer, state);
  const conflict = x.conflicts[0];

  if (decision === "decline") {
    const r = reason(offer, state);
    return {
      title: `Not ${when}.`,
      warm: `Hi ${m}, thanks for thinking of me. I can't do ${when}. ${r.warm}${wish.warm}`,
      plain: `Hi ${m}, I can't do ${when}, sorry. ${r.plain}${wish.plain}`,
      note: "Honest beats “I'm sick”. You don't owe a long explanation.",
      after: `${dayW} stays free. Your recovery kit is there if you want it: the favourite meal, an early night.${next ? ` ${cap(next)}.` : ""}`,
    };
  }
  if (decision === "negotiate") {
    const alt = opts.alt || altSlots(offer, state)[0];
    const altText = alt.nextWeek ? `the same shift next ${DAY_NAMES[alt.day]}` : `${DAY_NAMES[alt.day]} ${range12(alt.start, alt.end)}`;
    return {
      title: "Another time, then.",
      warm: `Hi ${m}, ${when} isn't going to work for me, but I could do ${altText} if that helps cover.${wish.warm}`,
      plain: `Hi ${m}, can't do ${when}. I can do ${altText} if that helps.`,
      note: `Offering a time keeps you a good colleague without spending ${when}.`,
      after: `If ${m} says yes to ${altText}, the shift lands in your week with the bus around it. ${protectedDay} stays protected either way.`,
    };
  }
  if (decision === "swap") {
    const who = opts.colleague || emp.colleagues[1];
    return {
      title: "Handing it on.",
      warm: `Hi ${m}, I can't do ${when}, but I've checked with ${who} and they can take it if that works for you.${wish.warm}`,
      plain: `Hi ${m}, can't do ${when}. ${who} can take it if that's okay.`,
      note: "A swap keeps the shift covered without spending your night.",
      after: `If ${m} approves, the shift moves to ${who}. Nothing changes in your week.`,
    };
  }
  // accept
  let arriveWarm = `See you at ${clock12(offer.start)}.`;
  let arrivePlain = `See you at ${clock12(offer.start)}.`;
  if (x.previous && x.travel.minutes === 0) {
    arriveWarm = `I'll just stay on after my ${range12(x.previous.start, x.previous.end)} shift.`;
    arrivePlain = `I'll stay on after my ${range12(x.previous.start, x.previous.end)}.`;
  } else if (x.previous) {
    const arrive = fromMinutes(minutes(x.previous.end) + x.travel.minutes);
    const tight = (x.travelBuffer ?? 99) < 30;
    arriveWarm = `My ${x.previous.phrase} finishes at ${clock12(x.previous.end)}, so I'll be there about ${clock12(arrive)}.${tight ? " Okay if I grab something to eat before I start?" : ""}`;
    arrivePlain = `There by ${clock12(arrive)} after my ${x.previous.phrase}.${tight ? " I'll eat on the way." : ""}`;
  }
  const conflictLine = conflict ? ` ${cap(conflict.phrase)} overlaps: a half-written note is waiting in Calendar.` : "";
  return {
    title: "Taking it. Fair enough.",
    warm: `Hi ${m}, yes, I can do ${when}. ${arriveWarm}`,
    plain: `Hi ${m}, yes. ${arrivePlain}`,
    note: "Saying yes is care too. The app just keeps tomorrow in view.",
    after: `Long day noted${x.previous ? `: ${x.previous.phrase} and a ${isClose(offer) ? "close" : "shift"}` : ""}. Check-in at ${clock12(offer.end)}${next ? `, ${next}` : ""}, and ${protectedDay} stays yours.${conflictLine}`,
  };
}

export function draftFor(draft: Draft, tone: Tone): string {
  return tone === "warm" ? draft.warm : draft.plain;
}

export function offerWhen(offer: Offer): string {
  return whenWord(offer);
}

export function offerDayWord(offer: Offer): string {
  return dayWord(offer);
}

/** A day's items with travel time written around shifts, as the calendar shows them. */
export function dayListWithTravel(view: DayView, state: DataState): (DayItem & { travelFor?: string })[] {
  const items: (DayItem & { travelFor?: string })[] = [];
  const real = view.items.filter((it) => it.kind !== "rest" && it.kind !== "due" && it.kind !== "offer");
  const travel = state.settings.travelFromUniMin;
  view.items.forEach((it) => {
    if (it.kind === "shift") {
      const prev = real.filter((e) => e.id !== it.id && minutes(e.end) <= minutes(it.start)).sort((a, b) => minutes(b.end) - minutes(a.end))[0];
      const next = real.filter((e) => e.id !== it.id && minutes(e.start) >= minutes(it.end)).sort((a, b) => minutes(a.start) - minutes(b.start))[0];
      const sameShop = prev && prev.kind === "shift" && prev.employer === it.employer && minutes(it.start) - minutes(prev.end) <= 30;
      const t = prev?.kind === "uni" ? travel : 25;
      if (!sameShop) items.push({ id: `${it.id}-t1`, kind: "shift", start: fromMinutes(minutes(it.start) - t), end: it.start, label: `Travel · ${t} min`, source: "Offshift", travelFor: it.id });
      items.push(it);
      const nextIsShift = next && next.kind === "shift" && minutes(next.start) - minutes(it.end) <= 30;
      if (!nextIsShift) items.push({ id: `${it.id}-t2`, kind: "shift", start: it.end, end: fromMinutes(minutes(it.end) + 25), label: "Travel home · 25 min", source: "Offshift", travelFor: it.id });
    } else items.push(it);
  });
  items.sort((a, b) => minutes(a.start) - minutes(b.start));
  return items;
}

/** Personal plans that a booked shift now sits on top of. */
export function clashes(state: DataState): Record<string, string> {
  const out: Record<string, string> = {};
  state.personal.forEach((p) => {
    const hit = state.shifts.find((s) => s.day === p.day && absMinutes(s.day, s.start) < absMinutes(p.day, p.end) && absMinutes(p.day, p.start) < absMinutes(s.day, s.end));
    if (hit) out[p.id] = `${EMPLOYERS[hit.employer].name} ${range12(hit.start, hit.end)}`;
  });
  return out;
}
