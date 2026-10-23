import { bodyNotes, bodySentence, bodyState } from "./body";
import { clock12, elapsedMinutes, minutes, range12, shiftImpact, spanMinutes } from "./logic";
import { addDays, dayNumber, daysBetween, nowIn, stamp, weekDates, weekdayName, weekdayOf, whenWord, type Now } from "./time";
import type {
  BodyRating,
  Check,
  CheckState,
  DateKey,
  DayItem,
  DayView,
  Offer,
  PersonalEvent,
  Settings,
  Shift,
  UniEvent,
  Wearable,
} from "./types";

export interface DataState {
  shifts: Shift[];
  uni: UniEvent[];
  personal: PersonalEvent[];
  offers: Offer[];
  settings: Settings;
  wearable?: Wearable | null;
}

/** Any moment Offshift reasons about: only the date and the clock matter. */
type When = Pick<Now, "date" | "time">;

interface Ev {
  id: string;
  date: DateKey;
  start: string;
  end: string;
  title: string;
  kind: "work" | "study" | "personal";
  source: string;
  workplace?: string;
  /** For a shift booked from an ask: that ask. */
  viaOffer?: string;
  /** How it reads after "your": "Café shift", "tutorial", "dinner with a friend". */
  phrase: string;
}

const RATED_WORD: Record<BodyRating, string> = { fine: "Fine", tired: "Tired", wiped: "Wiped" };
const ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven"];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function lcFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
function hours(span: { start: string; end: string }): number {
  return elapsedMinutes(span.start, span.end) / 60;
}
function hoursText(h: number): string {
  return h % 1 ? h.toFixed(1) : String(h);
}
function open(o: Offer): boolean {
  return o.status === "pending" || o.status === "deferred";
}

/** The workplaces the worker has named, in the order they first appear. */
export function workplacesOf(state: Pick<DataState, "shifts" | "offers">): string[] {
  const seen = new Map<string, string>();
  for (const name of [...state.shifts.map((s) => s.workplace), ...state.offers.map((o) => o.workplace)]) {
    const key = name.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, name.trim());
  }
  return [...seen.values()];
}

function workplaceIndex(state: Pick<DataState, "shifts" | "offers">, name: string): number {
  return Math.max(0, workplacesOf(state).findIndex((w) => w.toLowerCase() === name.trim().toLowerCase()));
}

/**
 * A shift that ends at or after the worker's late-finish time, counting past midnight.
 * A late-finish time before noon ("00:30") means after midnight, so a day shift never counts.
 */
export function isLateFinish(span: { start: string; end: string }, settings: Pick<Settings, "lateFinish">): boolean {
  const start = minutes(span.start);
  const end = minutes(span.end) <= start ? minutes(span.end) + 24 * 60 : minutes(span.end);
  const late = minutes(settings.lateFinish) < 12 * 60 ? minutes(settings.lateFinish) + 24 * 60 : minutes(settings.lateFinish);
  return end >= late;
}

export function shiftLabel(shift: Pick<Shift, "workplace" | "start" | "end">, settings: Pick<Settings, "lateFinish">): string {
  return `${shift.workplace} · ${isLateFinish(shift, settings) ? "late finish" : `${hoursText(hours(shift))}h`}`;
}

export function isRestDay(date: DateKey, settings: Pick<Settings, "restDays">): boolean {
  return settings.restDays.includes(weekdayOf(date));
}

/** Every commitment Offshift can see, flattened for the impact maths. Asks are not commitments yet. */
export function eventsFor(state: DataState): Ev[] {
  return [
    ...state.shifts.map((s): Ev => ({ id: s.id, date: s.date, start: s.start, end: s.end, title: `${s.workplace} shift`, phrase: `${s.workplace} shift`, kind: "work", source: s.workplace, workplace: s.workplace, viaOffer: s.viaOffer })),
    ...state.uni.filter((u) => u.type === "class").map((u): Ev => ({ id: u.id, date: u.date, start: u.start, end: u.end, title: u.title, phrase: lcFirst(u.title), kind: "study", source: "Classes" })),
    ...state.personal.map((p): Ev => ({ id: p.id, date: p.date, start: p.start, end: p.end, title: p.title, phrase: lcFirst(p.title), kind: "personal", source: "Plans" })),
  ];
}

/** What an ask runs into. A shift booked from this same ask isn't a clash with it. */
export function offerImpact(offer: Offer, state: DataState) {
  return shiftImpact(
    offer,
    eventsFor(state).filter((e) => e.viaOffer !== offer.id),
  );
}

/** Asks still waiting on the worker: new ones first, oldest first, then the ones they're deciding later. */
export function waitingAsks(offers: Offer[]): Offer[] {
  return offers.filter(open).sort((a, b) => (a.status !== b.status ? (a.status === "pending" ? -1 : 1) : a.sentAt.localeCompare(b.sentAt)));
}

/* ---------- days ---------- */

/** One day's items, sorted, as the calendar shows them. */
export function dayItems(state: DataState, date: DateKey): DayItem[] {
  const protectedIds = state.settings.protectedIds || [];
  const items: DayItem[] = [];
  state.uni
    .filter((u) => u.date === date)
    .forEach((u) =>
      items.push({
        id: u.id,
        kind: u.type === "due" ? "due" : "uni",
        start: u.start,
        end: u.end,
        label: u.type === "due" ? `${u.title} due` : u.title,
        source: "Classes",
        protected: protectedIds.includes(u.id),
        status: protectedIds.includes(u.id) ? "Class · Protected by you" : u.type === "due" ? "Due" : "Class",
      }),
    );
  state.shifts
    .filter((s) => s.date === date)
    .forEach((s) =>
      items.push({
        id: s.id,
        kind: "shift",
        start: s.start,
        end: s.end,
        label: shiftLabel(s, state.settings),
        source: s.workplace,
        workplace: s.workplace,
        workplaceIndex: workplaceIndex(state, s.workplace),
        warn: s.rated && s.rated !== "fine" ? `rated ${RATED_WORD[s.rated]}` : undefined,
        protected: protectedIds.includes(s.id),
        status: protectedIds.includes(s.id) ? "Rostered · Protected by you" : s.viaOffer ? "Rostered · from an ask" : "Rostered",
      }),
    );
  state.offers
    .filter((o) => o.date === date && open(o))
    .forEach((o) =>
      items.push({
        id: o.id,
        kind: "offer",
        start: o.start,
        end: o.end,
        label: `Ask from ${o.from} · ${isLateFinish(o, state.settings) ? "late finish" : `${hoursText(hours(o))}h`}`,
        source: o.workplace,
        workplace: o.workplace,
        workplaceIndex: workplaceIndex(state, o.workplace),
        offerId: o.id,
        later: o.status === "deferred" || undefined,
        status: o.status === "deferred" ? "Kept for later · press to decide" : "Waiting on you",
      }),
    );
  state.personal
    .filter((p) => p.date === date)
    .forEach((p) =>
      items.push({
        id: p.id,
        kind: "personal",
        start: p.start,
        end: p.end,
        label: p.title,
        source: "Plans",
        category: p.category || "personal",
        importance: p.importance || "flexible",
        protected: p.importance === "protected" || protectedIds.includes(p.id),
        status: p.importance === "protected" || protectedIds.includes(p.id) ? "Protected by you" : p.importance === "important" ? "Important" : "Flexible",
      }),
    );
  items.sort((a, b) => minutes(a.start) - minutes(b.start));
  if (isRestDay(date, state.settings) && !items.length) items.push({ id: `rest-${date}`, kind: "rest", start: "00:00", end: "23:59", label: "Rest day", source: "Offshift", status: "Kept clear by you" });
  return items;
}

export function dayView(state: DataState, date: DateKey, now: When): DayView {
  return { day: weekdayOf(date), date, dayNum: dayNumber(date), today: date === now.date, rest: isRestDay(date, state.settings), items: dayItems(state, date) };
}

/** The seven days, Monday to Sunday, of the week holding `date`. */
export function buildWeek(state: DataState, date: DateKey, now: When): DayView[] {
  return weekDates(date).map((d) => dayView(state, d, now));
}

/** Plans and classes that a booked shift now sits on top of. */
export function clashes(state: DataState): Record<string, string> {
  const out: Record<string, string> = {};
  const others = [...state.personal.map((p) => ({ id: p.id, date: p.date, start: p.start, end: p.end })), ...state.uni.filter((u) => u.type === "class").map((u) => ({ id: u.id, date: u.date, start: u.start, end: u.end }))];
  for (const o of others) {
    const [a, b] = spanMinutes(o);
    const hit = state.shifts.find((s) => {
      const [c, d] = spanMinutes(s);
      return a < d && c < b;
    });
    if (hit) out[o.id] = `${hit.workplace} ${range12(hit.start, hit.end)}`;
  }
  return out;
}

/* ---------- body tile ---------- */

/** How long a watch reading keeps counting. An old one says nothing about how the worker is now. */
const READING_HOURS = 12;

/** The watch's reading if it's recent, else none. */
export function currentWearable(state: DataState, now: When): Wearable | null {
  const w = state.wearable;
  if (!w) return null;
  if (!w.receivedAt) return w;
  const got = nowIn(state.settings.timeZone, new Date(w.receivedAt));
  return stamp(now.date, now.time) - stamp(got.date, got.time) <= READING_HOURS * 60 ? w : null;
}

export function bodyTile(state: DataState, now: When): { state: CheckState; label: string; detail: string } {
  const last = state.shifts.filter((s) => s.rated && s.date < now.date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const weekEnd = weekDates(now.date)[6];
  const early = new Set(eventsFor(state).filter((e) => e.date > now.date && e.date <= weekEnd && minutes(e.start) <= 10 * 60).map((e) => e.date)).size;
  const earlyLine = early ? ` ${cap(NUM[early] || String(early))} early start${early === 1 ? "" : "s"} ahead this week.` : "";
  const rated = last ? ` ${weekdayName(last.date)}'s ${isLateFinish(last, state.settings) ? "late finish" : "shift"} rated ${RATED_WORD[last.rated!]}.` : "";
  const w = currentWearable(state, now);
  if (w) {
    const notes = w.signals ? bodyNotes(w.signals) : "";
    return { state: bodyState(w), label: w.word, detail: `From your watch at ${clock12(w.at)}.${notes ? ` ${cap(notes)}.` : ""}${rated}${earlyLine}` };
  }
  if (!last) return { state: "ok", label: "No readings yet", detail: `Pair the watch, or rate a shift after you finish it.${earlyLine}` };
  const detail = `${rated.trim()}${earlyLine}`;
  if (last.rated === "wiped") return { state: "bad", label: "Running on empty", detail };
  if (last.rated === "tired") return { state: "warn", label: "Getting tired", detail };
  return { state: "ok", label: "Doing okay", detail };
}

/* ---------- the checks ---------- */

/** "tonight", "on Friday", "on Wed 28 Oct": a when-word that reads right mid-sentence. */
function onWhen(when: string): string {
  return /^(today|tonight|tomorrow)$/.test(when) ? when : `on ${when}`;
}
function hoursPhrase(h: number): string {
  return `${hoursText(h)} ${h === 1 ? "hour" : "hours"}`;
}
/** "45 minutes", "1 minute", or hours once it's long: "3 hours", "2.5 hours". */
function gapPhrase(min: number): string {
  if (min >= 90) return hoursPhrase(Math.round((min / 60) * 2) / 2);
  return `${min} ${min === 1 ? "minute" : "minutes"}`;
}
/** The day itself as a word: today, tomorrow, Friday, Wed 28 Oct. */
function dayOf(date: DateKey, now: When): string {
  return whenWord(date, "00:00", now);
}
function dayWord(offer: Offer, now: When): string {
  return cap(whenWord(offer.date, offer.start, now));
}

/** "Friday starts at 8 am": the first commitment on the day after the ask. */
function nextDayLine(offer: Offer, state: DataState): string {
  const nd = addDays(offer.date, 1);
  const first = eventsFor(state)
    .filter((e) => e.date === nd && e.viaOffer !== offer.id)
    .sort((a, b) => minutes(a.start) - minutes(b.start))[0];
  return first ? `${weekdayName(nd)} starts at ${clock12(first.start)}` : "";
}

export function bodyCheck(offer: Offer, state: DataState, now: When): Check {
  const base = bodyCheckFromWeek(offer, state, now);
  const w = currentWearable(state, now);
  if (!w || isRestDay(offer.date, state.settings)) return base;
  const rank: Record<CheckState, number> = { ok: 0, warn: 1, bad: 2 };
  const fromWatch = bodyState(w);
  return { ...base, state: rank[fromWatch] > rank[base.state] ? fromWatch : base.state, text: `${bodySentence(w)} ${base.text}` };
}

function bodyCheckFromWeek(offer: Offer, state: DataState, now: When): Check {
  const s = state.settings;
  if (isRestDay(offer.date, s)) {
    const busy = eventsFor(state).some((e) => e.date === offer.date && e.viaOffer !== offer.id);
    return { key: "body", state: "bad", text: busy ? `${weekdayName(offer.date)} is a rest day you set aside. Giving more of it away is your call.` : `${weekdayName(offer.date)} is a rest day you set aside, so nothing else lands on it. Giving it away is your call.` };
  }
  const shifts = state.shifts.filter((sh) => sh.viaOffer !== offer.id);
  const from = addDays(offer.date, -2);
  const recent = shifts.filter((sh) => sh.date >= from && sh.date <= offer.date);
  const recentLate = recent.filter((sh) => isLateFinish(sh, s)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const lates = recentLate.length + (isLateFinish(offer, s) ? 1 : 0);
  const last = shifts.filter((sh) => sh.rated && sh.date < offer.date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const heavy = recent.filter((sh) => sh.rated && sh.rated !== "fine" && sh.date < offer.date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const next = nextDayLine(offer, state);
  const span = recentLate.length ? daysBetween(recentLate[0].date, offer.date) + 1 : 1;
  const legs = heavy ? `${weekdayName(heavy.date)}'s ${isLateFinish(heavy, s) ? "late finish" : "shift"} is still in your legs. You rated it ${RATED_WORD[heavy.rated!]}. ` : "";
  const word = dayWord(offer, now);
  if (lates >= s.lateFinishesBeforeFlag && isLateFinish(offer, s)) {
    const within = span === 1 ? "of the day" : `in ${NUM[span] || span} days`;
    return { key: "body", state: "warn", text: `${legs}${word} would be your ${ORD[lates - 1] || `${lates}th`} late finish ${within}${next ? `, and ${next}` : ""}.` };
  }
  const sameDay = shifts.filter((sh) => sh.date === offer.date);
  const dayHours = sameDay.reduce((sum, sh) => sum + hours(sh), 0) + hours(offer);
  if (sameDay.length && dayHours >= 9) {
    return { key: "body", state: "warn", text: `${legs}With your ${range12(sameDay[0].start, sameDay[0].end)} shift that's ${hoursPhrase(dayHours)} of work ${onWhen(dayOf(offer.date, now))}${next ? `, and ${next}` : ""}.` };
  }
  const x = offerImpact(offer, state);
  if (x.next && x.restAfter !== null && x.restAfter < 10 * 60) {
    const when = x.next.date === offer.date ? `at ${clock12(x.next.start)}` : `${onWhen(dayOf(x.next.date, now))} at ${clock12(x.next.start)}`;
    return { key: "body", state: "warn", text: `${legs}Leaves ${hoursPhrase(Math.round((x.restAfter / 60) * 2) / 2)} before your ${x.next.phrase} ${when}.` };
  }
  if (last && last.rated === "wiped") {
    return { key: "body", state: "warn", text: `You rated ${weekdayName(last.date)}'s shift Wiped. ${word} is not a late finish, but that is worth remembering${next ? `. ${cap(next)}` : ""}.` };
  }
  return { key: "body", state: "ok", text: `Nothing heavy in the days around this.${last ? ` ${weekdayName(last.date)}'s shift you rated ${RATED_WORD[last.rated!]}.` : ""}${next ? ` ${cap(next)}.` : ""}` };
}

export function weekCheck(offer: Offer, state: DataState, now: When): Check {
  const x = offerImpact(offer, state);
  const when = whenWord(offer.date, offer.start, now);
  const nd = addDays(offer.date, 1);
  const due = state.uni.filter((u) => u.type === "due" && (u.date === offer.date || u.date === nd)).sort((a, b) => (a.date + a.start < b.date + b.start ? -1 : 1))[0];
  const dueLine = due ? ` ${due.title} is due ${onWhen(whenWord(due.date, due.start, now))} at ${clock12(due.start)}.` : "";
  let gapSentence = "";
  let tight = false;
  if (x.previous) {
    const gap = x.gapBefore ?? 0;
    const sameShop = x.previous.kind === "work" && x.previous.workplace?.trim().toLowerCase() === offer.workplace.trim().toLowerCase();
    if (sameShop && gap <= 30) {
      tight = true;
      gapSentence = ` Runs straight on from your ${range12(x.previous.start, x.previous.end)} shift: ${hoursPhrase(hours(x.previous) + hours(offer))} in one go.`;
    } else {
      tight = gap < 30;
      gapSentence = gap <= 0 ? ` Your ${x.previous.phrase} ends at ${clock12(x.previous.end)}, right as this starts.` : ` Your ${x.previous.phrase} ends at ${clock12(x.previous.end)}, ${tight ? "only " : ""}${gapPhrase(gap)} before this starts.`;
    }
  }
  if (x.conflicts.length) {
    const c = x.conflicts[0];
    return { key: "week", state: "bad", text: `Overlaps your ${c.phrase}, ${range12(c.start, c.end)}.${gapSentence}${dueLine}` };
  }
  if (isRestDay(offer.date, state.settings)) {
    const busy = eventsFor(state).some((e) => e.date === offer.date && e.viaOffer !== offer.id);
    return { key: "week", state: due ? "warn" : "ok", text: `${busy ? `${weekdayName(offer.date)} is a rest day you set aside.` : `Nothing else is on ${weekdayName(offer.date)}: it's a rest day you set aside.`}${dueLine}` };
  }
  if (tight) return { key: "week", state: "warn", text: `${gapSentence.trim()}${dueLine}` };
  return { key: "week", state: due ? "warn" : "ok", text: `${x.previous ? gapSentence.trim() : `Nothing else ${onWhen(when)} before it.`}${dueLine}` };
}

export function offerChecks(offer: Offer, state: DataState, now: When): Check[] {
  return [bodyCheck(offer, state, now), weekCheck(offer, state, now)];
}

export function offerWhen(offer: Offer, now: When): string {
  return whenWord(offer.date, offer.start, now);
}
