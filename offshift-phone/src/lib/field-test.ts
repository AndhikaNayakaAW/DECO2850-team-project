/**
 * Field test F1, 19 to 25 October 2026: one fast-food worker's week with Offshift, for the /field-testing page.
 * Rebuilt from the field-test notes: his shifts, classes, demo, ratings and answers are as he reported them. The
 * 15-minute readings are a reconstruction of what he described (stress high on Monday, lower on Sunday), not the raw
 * watch data. The workplace is anonymised as "Burger bar", as on the posters. Read only: it never reaches a session.
 */
import { watchSummary } from "./garmin";
import { shiftBodyLines } from "./shift-body";
import { instantOf, nowIn } from "./time";
import type { DataSlice, DateKey, Decision, Effort, OfferStatus } from "./types";

export const FIELD_TEST_WEEK: DateKey = "2026-10-19";
const TZ = "Australia/Brisbane";
const n = null;

export function fieldTestData(): DataSlice {
  return {
    schema: 2,
    sessionStartedAt: "2026-10-18T14:00:00.000Z",
    shifts: [
      { id: "f1-mon", date: "2026-10-19", start: "16:00", end: "22:00", workplace: "Burger bar", effort: "hard",
        body: { receivedAt: "2026-10-19T12:20:00.000Z", stress: [2, 2, 2, 3, 3, 3, 3, 3, 3, 3, n, 3, 3, 3, 3, 3, 3, 3, 2, 3, 3, 3, 2, 2], heart: [1, 2, 2, 2, 2, 3, 3, 3, 2, 2, 3, 3, 3, 3, 2, 2, 2, 3, 3, 2, 2, 2, 1, 1] } },
      { id: "f1-wed", date: "2026-10-21", start: "17:00", end: "22:00", workplace: "Burger bar", effort: "busy",
        body: { receivedAt: "2026-10-21T12:20:00.000Z", stress: [1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 2, 2, 2, n, n, 2, 2, 1, 1], heart: [1, 1, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 1, 2, 2, 1, 1, 1, 1] } },
      { id: "f1-sun", date: "2026-10-25", start: "10:00", end: "15:00", workplace: "Burger bar", effort: "steady",
        body: { receivedAt: "2026-10-25T05:20:00.000Z", stress: [0, 1, 1, 1, 1, 1, 2, 2, 1, 1, n, 1, 0, 1, 1, 1, 1, 0, 0, 0], heart: [1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0] } },
    ],
    uni: [
      { id: "f1-u1", date: "2026-10-20", start: "10:00", end: "12:00", title: "Lecture", type: "class" },
      { id: "f1-u2", date: "2026-10-20", start: "14:00", end: "16:00", title: "Tutorial", type: "class" },
      { id: "f1-u3", date: "2026-10-22", start: "09:00", end: "11:00", title: "Lecture", type: "class" },
      { id: "f1-u4", date: "2026-10-22", start: "13:00", end: "15:00", title: "Practical", type: "class" },
      { id: "f1-u5", date: "2026-10-23", start: "13:00", end: "14:00", title: "Coding tutorial demo", type: "due" },
    ],
    personal: [{ id: "f1-p1", date: "2026-10-22", start: "18:00", end: "22:00", title: "Demo prep", category: "study", importance: "important" }],
    offers: [
      { id: "f1-o1", from: "Sam", workplace: "Burger bar", date: "2026-10-22", start: "17:00", end: "22:00", note: "Can you cover Thursday night?",
        sentAt: "2026-10-20T08:00:00.000Z", status: "declined", repliedAt: "2026-10-20T08:04:00.000Z" },
      { id: "f1-o2", from: "Sam", workplace: "Burger bar", date: "2026-10-24", start: "17:00", end: "22:00", note: "Can you do Saturday night?",
        sentAt: "2026-10-24T01:00:00.000Z", status: "declined", repliedAt: "2026-10-24T03:30:00.000Z" },
    ],
    messages: [],
    sync: [],
    settings: { name: "", restDays: [], protectedIds: [], lateFinish: "21:00", lateFinishesBeforeFlag: 2, timeZone: TZ },
  };
}

/** The watch asks how the work was this long after a shift ends. */
const CHECK_IN_MS = 15 * 60_000;

function checkInAt(s: { date: DateKey; end: string }): number {
  return instantOf(s.date, s.end, TZ) + CHECK_IN_MS;
}

/** The week as it stood at one instant: asks not yet sent are gone, answers and ratings not yet given are unmade, readings not yet in are missing. */
function asOf(data: DataSlice, at: number): DataSlice {
  return {
    ...data,
    offers: data.offers
      .filter((o) => Date.parse(o.sentAt) <= at)
      .map((o) => (o.repliedAt && Date.parse(o.repliedAt) > at ? { ...o, status: "pending" as OfferStatus, repliedAt: undefined } : o)),
    shifts: data.shifts.map((s) => ({
      ...s,
      effort: checkInAt(s) < at ? s.effort : undefined,
      body: s.body && Date.parse(s.body.receivedAt) <= at ? s.body : undefined,
    })),
  };
}

export type WatchScreen =
  | { kind: "check-in"; title: string; chosen: Effort }
  | { kind: "ask"; from: string; question: string; time: string; quiet: string | null }
  | { kind: "around"; lines: string[] }
  | { kind: "answer"; to: string; chosen: Decision }
  | { kind: "last-shift"; title: string; lines: string[] };

export interface WatchMoment {
  id: string;
  date: DateKey;
  time: string;
  caption: string;
  screen: WatchScreen;
}

const DECISION: Partial<Record<OfferStatus, Decision>> = { accepted: "accept", declined: "decline", deferred: "later" };
const EFFORT_SAID: Record<Effort, string> = { light: "Light", steady: "Steady", busy: "Busy", hard: "Hard" };

/** Each moment the watch spoke up that week, worked out with the watch's own logic from the week as it stood then. */
export function fieldTestMoments(): WatchMoment[] {
  const data = fieldTestData();
  const moments: (WatchMoment & { at: number })[] = [];
  const add = (id: string, at: number, caption: string, screen: WatchScreen) => {
    const local = nowIn(TZ, new Date(at));
    moments.push({ id, at, date: local.date, time: local.time, caption, screen });
  };

  for (const s of data.shifts) {
    const at = checkInAt(s);
    const due = watchSummary(asOf(data, at), new Date(at)).checkIn;
    if (due && s.effort) add(`${s.id}-check-in`, at, `"How was the work?" after the shift. He picks ${EFFORT_SAID[s.effort]}.`, { kind: "check-in", title: due.title, chosen: s.effort });
  }

  for (const o of data.offers) {
    const at = Date.parse(o.sentAt) + 60_000;
    const ask = watchSummary(asOf(data, at), new Date(at)).ask;
    if (!ask) continue;
    add(`${o.id}-ask`, at, `${ask.from} asks him to cover ${ask.when === "tonight" ? "tonight" : ask.when}.`, { kind: "ask", from: `${ask.from} - ${ask.employer}`, question: `Cover ${ask.when}?`, time: ask.time, quiet: ask.quiet });
    add(`${o.id}-around`, at + 1, "Next page: how his last shifts there went, and the week around the ask.", { kind: "around", lines: [ask.past, ...ask.week].filter((l): l is string => !!l) });
    const chosen = DECISION[o.status];
    if (chosen && o.repliedAt) add(`${o.id}-answer`, Date.parse(o.repliedAt), `He chooses ${chosen === "decline" ? "Decline" : chosen === "accept" ? "Accept" : "Decide later"}. Nothing is sent to ${o.from}.`, { kind: "answer", to: o.from, chosen });
  }

  const read = data.shifts.at(-1)!;
  const at = Date.parse(read.body!.receivedAt) + 60_000;
  const title = watchSummary(asOf(data, checkInAt(read)), new Date(checkInAt(read))).checkIn?.title ?? read.workplace;
  add(`${read.id}-read`, at, "The last shift, read back in words.", { kind: "last-shift", title, lines: shiftBodyLines(read) });

  return moments.sort((a, b) => a.at - b.at).map(({ at: _at, ...m }) => m);
}
