/**
 * The exhibition demo week, built around the moment /demo opens so the watch's timing always works: a 4-hour Cafe
 * shift that ended about 20 minutes ago under high stress (the watch asks how the work was), three earlier Cafe
 * shifts that went steady, busy and hard, and an ask from Sam to cover tonight (tomorrow evening once it's late) that
 * clashes with study and runs into an early lecture. The same classes and plans repeat last week, this week and next
 * week, so the calendar looks lived in whichever week a visitor turns to; shifts don't repeat, and next week has none.
 * Designed for the exhibition, 10 am to 2 pm on Thursday 29 October 2026, when the shift that just ended is a
 * morning one, but it works whenever it opens. No one's name: a visitor is "you". It lives only in the demo's own week.
 */
import { uid } from "./ids";
import { minutes } from "./logic";
import { emptyData } from "./session";
import { BLOCK_MINUTES } from "./shift-body";
import { DEFAULT_TIME_ZONE, addDays, instantOf, nowIn, weekStart } from "./time";
import type { DataSlice, DateKey, Importance, Load, PersonalEvent, PlanCategory, Shift, UniEvent } from "./types";

const TZ = DEFAULT_TIME_ZONE;
const DAY = 24 * 60;
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** The classes every week, by weekday (0 is Monday). Thursday morning stays free for the shift that just ended. */
const CLASSES: { day: number; start: string; end: string; title: string }[] = [
  { day: 0, start: "10:00", end: "12:00", title: "Lecture" },
  { day: 1, start: "09:00", end: "11:00", title: "Lecture" },
  { day: 2, start: "13:00", end: "15:00", title: "Tutorial" },
  { day: 3, start: "15:00", end: "16:30", title: "Practical" },
  { day: 4, start: "09:00", end: "11:00", title: "Lecture" },
];

/** The plans every week, by weekday. */
const PLANS: { day: number; start: string; end: string; title: string; category: PlanCategory; importance: Importance }[] = [
  { day: 5, start: "09:00", end: "10:00", title: "Gym", category: "personal", importance: "flexible" },
  { day: 6, start: "18:00", end: "19:00", title: "Call home", category: "personal", importance: "important" },
];

/** Readings arrive a few minutes after a shift ends, as they would from the watch. */
function received(date: DateKey, end: string): string {
  return new Date(instantOf(date, end, TZ) + 5 * 60_000).toISOString();
}

function cafe(date: DateKey, start: string, end: string, stress: (Load | null)[], heart: (Load | null)[], effort?: Shift["effort"]): Shift {
  // A finish before the start is the next morning.
  const endDate = minutes(end) <= minutes(start) ? addDays(date, 1) : date;
  return { id: uid("s"), date, start, end, workplace: "Cafe", ...(effort ? { effort } : {}), body: { receivedAt: received(endDate, end), stress, heart } };
}

/** Whether something from start to end on a date overlaps one of the shifts, including one that ran past midnight into it. */
function onAShift(date: DateKey, start: string, end: string, shifts: Shift[]): boolean {
  const s = minutes(start);
  const e = minutes(end);
  return shifts.some((sh) => {
    const a = minutes(sh.start);
    const b = minutes(sh.end) <= a ? minutes(sh.end) + DAY : minutes(sh.end);
    if (sh.date === date) return s < b && a < e;
    return b > DAY && addDays(sh.date, 1) === date && s < b - DAY;
  });
}

export function demoWeek(at: Date = new Date()): DataSlice {
  const now = nowIn(TZ, at);
  const today = now.date;
  const data = emptyData(at);

  // The shift that just ended: 4 hours, finishing on the quarter hour at least 20 minutes ago.
  let end = Math.floor((minutes(now.time) - 20) / BLOCK_MINUTES) * BLOCK_MINUTES;
  let endDate = today;
  if (end < 0) {
    end += DAY;
    endDate = addDays(today, -1);
  }
  let start = end - 4 * 60;
  let startDate = endDate;
  if (start < 0) {
    start += DAY;
    startDate = addDays(endDate, -1);
  }
  const justNow: Shift = {
    id: uid("s"),
    date: startDate,
    start: clock(start),
    end: clock(end),
    workplace: "Cafe",
    body: {
      receivedAt: received(endDate, clock(end)),
      stress: [2, 2, 3, 3, 3, 3, 2, 3, 3, 3, 3, 2, 3, 3, 3, 2],
      heart: [1, 2, 2, 2, 2, 3, 3, 2, 2, 2, 3, 3, 2, 2, 1, 1],
    },
  };

  const shifts = [
    cafe(addDays(today, -8), "16:00", "21:00", [1, 1, 1, 2, 2, 2, 1, 1, 2, 2, 1, 1, 1, 2, 2, 1, 1, 1, 0, 1], [1, 1, 2, 2, 2, 1, 1, 2, 2, 2, 1, 1, 1, 2, 2, 1, 1, 1, 1, 0], "steady"),
    cafe(addDays(today, -4), "12:00", "17:00", [1, 1, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 2, 2, 2, 1, 1, 1, 1], [1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 1, 1, 1, 1, 1], "busy"),
    cafe(addDays(today, -2), "16:00", "21:00", [2, 2, 3, 3, 3, 3, 3, 2, 3, 3, null, 3, 3, 3, 3, 3, 2, 2, 3, 2], [1, 2, 2, 2, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 2, 2, 2, 2, 1, 1], "hard"),
    justNow,
  ];

  // Sam asks to cover tonight, or tomorrow evening once tonight is too close.
  const askDate = now.time < "16:00" ? today : addDays(today, 1);

  // Last week, this week and next week. Anything that would overlap a shift is left out, so nothing clashes but the ask.
  const mondays = [-7, 0, 7].map((n) => addDays(weekStart(today), n));
  const free = (x: { date: DateKey; start: string; end: string }) => !onAShift(x.date, x.start, x.end, shifts);
  const classes: UniEvent[] = mondays.flatMap((monday) =>
    CLASSES.map((c) => ({ id: uid("u"), date: addDays(monday, c.day), start: c.start, end: c.end, title: c.title, type: "class" as const })),
  );
  const plans: PersonalEvent[] = mondays.flatMap((monday) =>
    PLANS.map((p) => ({ id: uid("p"), date: addDays(monday, p.day), start: p.start, end: p.end, title: p.title, category: p.category, importance: p.importance })),
  );

  return {
    ...data,
    shifts,
    uni: [...classes.filter(free), { id: uid("u"), date: addDays(askDate, 1), start: "23:59", end: "23:59", title: "Assignment", type: "due" }],
    personal: [
      ...plans.filter(free),
      { id: uid("p"), date: askDate, start: "19:00", end: "21:00", title: "Study for the assignment", category: "study", importance: "important" },
    ],
    offers: [
      { id: uid("o"), from: "Sam", workplace: "Cafe", date: askDate, start: "17:00", end: "22:00", note: "Someone called in sick. Can you cover?", sentAt: at.toISOString(), status: "pending" },
    ],
  };
}
