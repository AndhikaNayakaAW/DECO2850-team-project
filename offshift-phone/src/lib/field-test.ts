/**
 * Field test F1, Friday 23 to Wednesday 28 October 2026: six days of one fast-food worker's life with Offshift, for the
 * /field-testing page. His days are as he reported them: shifts on Friday, Sunday and Tuesday afternoon, classes on
 * Friday, Monday and Wednesday, and a coding demo on Tuesday morning, which made Tuesday his most stressful day, with
 * Sunday's lunch rush next. The exact times, his ratings and the two asks were filled in by the team to match that
 * account, and the 15-minute readings are a reconstruction of what he described, not the raw watch data. The
 * workplace is anonymised as "Burger bar", as on the posters. Read only: it never reaches a session.
 */
import { watchSummary } from "./garmin";
import { shiftBodyLines } from "./shift-body";
import { addDays, instantOf, nowIn } from "./time";
import type { DataSlice, DateKey, Decision, Effort, OfferStatus } from "./types";

/** The six days, Friday to Wednesday. */
export const FIELD_TEST_DAYS: DateKey[] = Array.from({ length: 6 }, (_, i) => addDays("2026-10-23", i));
const TZ = "Australia/Brisbane";
const n = null;

export function fieldTestData(): DataSlice {
  return {
    schema: 2,
    sessionStartedAt: "2026-10-22T14:00:00.000Z",
    shifts: [
      { id: "f1-fri", date: "2026-10-23", start: "17:00", end: "22:00", workplace: "Burger bar", effort: "steady",
        body: { receivedAt: "2026-10-23T12:20:00.000Z", stress: [1, 1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 1, n, 1, 1, 1, 0, 1, 0, 0], heart: [1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0] } },
      { id: "f1-sun", date: "2026-10-25", start: "11:00", end: "17:00", workplace: "Burger bar", effort: "busy",
        body: { receivedAt: "2026-10-25T07:20:00.000Z", stress: [1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, n, 2, 2, 3, 3, 2, 2, 2, 1, 1], heart: [1, 2, 2, 2, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 1, 1, 1] } },
      { id: "f1-tue", date: "2026-10-27", start: "13:00", end: "18:00", workplace: "Burger bar", effort: "hard",
        body: { receivedAt: "2026-10-27T08:20:00.000Z", stress: [3, 3, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, n, 3, 3, 3, 3, 3, 2, 2], heart: [2, 2, 3, 3, 3, 3, 2, 3, 3, 3, 3, 2, 2, 3, 3, 3, 2, 2, 2, 1] } },
    ],
    uni: [
      { id: "f1-u1", date: "2026-10-23", start: "09:00", end: "11:00", title: "Lecture", type: "class" },
      { id: "f1-u2", date: "2026-10-26", start: "10:00", end: "12:00", title: "Lecture", type: "class" },
      { id: "f1-u3", date: "2026-10-26", start: "14:00", end: "16:00", title: "Tutorial", type: "class" },
      { id: "f1-u4", date: "2026-10-27", start: "09:00", end: "10:00", title: "Coding demo", type: "class" },
      { id: "f1-u5", date: "2026-10-28", start: "09:00", end: "11:00", title: "Lecture", type: "class" },
    ],
    personal: [{ id: "f1-p1", date: "2026-10-26", start: "19:00", end: "22:00", title: "Demo prep", category: "study", importance: "important" }],
    offers: [
      { id: "f1-o1", from: "Sam", workplace: "Burger bar", date: "2026-10-26", start: "17:00", end: "22:00", note: "Can you cover Monday night?",
        sentAt: "2026-10-24T08:00:00.000Z", status: "declined", repliedAt: "2026-10-24T08:03:00.000Z" },
      { id: "f1-o2", from: "Sam", workplace: "Burger bar", date: "2026-10-28", start: "17:00", end: "22:00", note: "Can you do Wednesday night?",
        sentAt: "2026-10-26T09:30:00.000Z", status: "declined", repliedAt: "2026-10-27T09:10:00.000Z" },
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
