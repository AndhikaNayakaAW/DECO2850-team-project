/**
 * The exhibition demo week, built around the moment /demo opens so the watch's timing always works: a 4-hour Cafe
 * shift that ended about 20 minutes ago under high stress (the watch asks how the work was), two earlier Cafe shifts
 * that were hard and busy, and an ask from Sam to cover tonight (tomorrow evening once it's late) that clashes with
 * study and runs into an early lecture. No one's name: a visitor is "you". It lives only in the demo's own week.
 */
import { uid } from "./ids";
import { minutes } from "./logic";
import { emptyData } from "./session";
import { BLOCK_MINUTES } from "./shift-body";
import { DEFAULT_TIME_ZONE, addDays, instantOf, nowIn } from "./time";
import type { DataSlice, DateKey, Load, Shift } from "./types";

const TZ = DEFAULT_TIME_ZONE;
const DAY = 24 * 60;
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Readings arrive a few minutes after a shift ends, as they would from the watch. */
function received(date: DateKey, end: string): string {
  return new Date(instantOf(date, end, TZ) + 5 * 60_000).toISOString();
}

function cafe(date: DateKey, start: string, end: string, stress: (Load | null)[], heart: (Load | null)[], effort?: Shift["effort"]): Shift {
  // A finish before the start is the next morning.
  const endDate = minutes(end) <= minutes(start) ? addDays(date, 1) : date;
  return { id: uid("s"), date, start, end, workplace: "Cafe", ...(effort ? { effort } : {}), body: { receivedAt: received(endDate, end), stress, heart } };
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

  // Sam asks to cover tonight, or tomorrow evening once tonight is too close.
  const askDate = now.time < "16:00" ? today : addDays(today, 1);

  return {
    ...data,
    shifts: [
      cafe(addDays(today, -4), "12:00", "17:00", [1, 1, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 1, 2, 2, 2, 1, 1, 1, 1], [1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 1, 1, 1, 1, 1], "busy"),
      cafe(addDays(today, -2), "16:00", "21:00", [2, 2, 3, 3, 3, 3, 3, 2, 3, 3, null, 3, 3, 3, 3, 3, 2, 2, 3, 2], [1, 2, 2, 2, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 2, 2, 2, 2, 1, 1], "hard"),
      justNow,
    ],
    uni: [
      { id: uid("u"), date: addDays(askDate, 1), start: "09:00", end: "11:00", title: "Lecture", type: "class" },
      { id: uid("u"), date: addDays(askDate, 1), start: "23:59", end: "23:59", title: "Assignment", type: "due" },
      { id: uid("u"), date: addDays(askDate, 2), start: "13:00", end: "15:00", title: "Tutorial", type: "class" },
    ],
    personal: [{ id: uid("p"), date: askDate, start: "19:00", end: "21:00", title: "Study for the assignment", category: "study", importance: "important" }],
    offers: [
      { id: uid("o"), from: "Sam", workplace: "Cafe", date: askDate, start: "17:00", end: "22:00", note: "Someone called in sick. Can you cover?", sentAt: at.toISOString(), status: "pending" },
    ],
  };
}
