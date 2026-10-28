import { describe, expect, it } from "vitest";
import { demoWeek } from "../demo";
import { applyEffort } from "../effort";
import { watchRange, watchSummary } from "../garmin";
import { minutes } from "../logic";
import { blockCount, describeSignal } from "../shift-body";
import { addDays, instantOf, weekDates, weekStart } from "../time";
import type { DataSlice, DateKey } from "../types";
import { cleanData } from "../validate";

const at = (date: string, time: string) => new Date(instantOf(date, time, "Australia/Brisbane"));
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const LUNCH = at("2026-10-29", "13:00");
const EVENING = at("2026-10-29", "17:30");
/** Every quarter hour the exhibition is open: 10 am to 2 pm on Thursday 29 October. */
const EXHIBITION = Array.from({ length: 17 }, (_, i) => at("2026-10-29", clock(10 * 60 + i * 15)));
const THIS_WEEK = weekStart("2026-10-29");

/** Everything on the week with a time to clash: shifts, classes and plans (a due date has no length). */
function timed(d: DataSlice) {
  return [
    ...d.shifts.map((s) => ({ what: `shift ${s.start}`, date: s.date, start: s.start, end: s.end })),
    ...d.uni.filter((u) => u.type === "class").map((u) => ({ what: u.title, date: u.date, start: u.start, end: u.end })),
    ...d.personal.map((p) => ({ what: p.title, date: p.date, start: p.start, end: p.end })),
  ];
}

/** Pairs of items on the same day whose times overlap. */
function clashes(d: DataSlice): string[] {
  const span = (x: { start: string; end: string }) => [minutes(x.start), minutes(x.end) <= minutes(x.start) ? minutes(x.end) + 1440 : minutes(x.end)];
  const items = timed(d);
  return items.flatMap((a, i) =>
    items.slice(i + 1).filter((b) => {
      const [as, ae] = span(a);
      const [bs, be] = span(b);
      return a.date === b.date && as < be && bs < ae;
    }).map((b) => `${a.date}: ${a.what} with ${b.what}`),
  );
}

/** The week's classes and plans by weekday, as "0 10:00-12:00 Lecture" (0 is Monday). */
function routine(d: DataSlice, monday: DateKey): string[] {
  const days = weekDates(monday);
  return [...d.uni.filter((u) => u.type === "class"), ...d.personal]
    .filter((x) => days.includes(x.date))
    .map((x) => `${days.indexOf(x.date)} ${x.start}-${x.end} ${x.title}`)
    .sort();
}

describe("the exhibition demo week", () => {
  it("is a well-formed week the calendar and watch can use, with no one's name on it", () => {
    const d = demoWeek(LUNCH);
    expect(cleanData(d)).not.toBeNull();
    expect(d.settings.name).toBe("");
    expect(d.sessionStartedAt).toBe(LUNCH.toISOString());
  });

  it("starts each time as a new session, so a page or watch from an earlier run takes it as new", () => {
    expect(demoWeek(LUNCH).sessionStartedAt).not.toBe(demoWeek(EVENING).sessionStartedAt);
  });

  it("has a Cafe shift that just ended under high stress, so the watch asks how the work was", () => {
    const d = demoWeek(LUNCH);
    const w = watchSummary(d, LUNCH);
    expect(w.checkIn?.title).toBe("Cafe, 8:30 am - 12:30 pm");
    const just = d.shifts.find((s) => s.id === w.checkIn!.id)!;
    expect(describeSignal(just.body!.stress, "stress")).toMatch(/^Stress mostly high/);
  });

  it("has an ask from Sam for tonight waiting, and the watch buzzes for it because the shift is over", () => {
    const w = watchSummary(demoWeek(LUNCH), LUNCH);
    expect(w.ask).toMatchObject({ from: "Sam", employer: "Cafe", when: "tonight", time: "5-10 pm", status: "pending", quiet: null });
  });

  it("asks for tomorrow evening instead when the demo opens late in the day", () => {
    const w = watchSummary(demoWeek(EVENING), EVENING);
    expect(w.ask).toMatchObject({ when: "tomorrow", time: "5-10 pm" });
  });

  it("shows the past Cafe shifts on the watch, and the new rating joins them", () => {
    const d = demoWeek(LUNCH);
    expect(watchSummary(d, LUNCH).ask?.past).toBe("Last 4 at Cafe: not rated, Hard, Busy, Steady");
    const rated = applyEffort(d, watchSummary(d, LUNCH).checkIn!.id, "hard", LUNCH)!.data;
    expect(watchSummary(rated, LUNCH).ask?.past).toBe("Last 4 at Cafe: Hard, Hard, Busy, Steady");
  });

  it("shows the shift that just ended on the watch's Last shift page, with the calendar's times and readings", () => {
    // Opened at 11:59 pm on Wednesday, the shift that just ended is 7:30-11:30 pm on the calendar.
    const d = demoWeek(at("2026-10-28", "23:59"));
    const just = d.shifts.find((s) => s.date === "2026-10-28")!;
    expect([just.start, just.end]).toEqual(["19:30", "23:30"]);
    expect(watchSummary(d, at("2026-10-29", "00:01")).lastShift).toEqual({ id: just.id, title: "Cafe, 7:30-11:30 pm", stress: just.body!.stress, heart: just.body!.heart });
  });

  it("puts the clash with tonight's study and the next morning's lecture in the ask's week lines", () => {
    // Thursday 29 October: the ask is tonight, Friday starts with a 9 am lecture.
    const week = watchSummary(demoWeek(LUNCH), LUNCH).ask?.week;
    expect(week).toContain("7pm clash: Study for the assignment");
    expect(week).toContain("Fri starts 9am");
  });
});

describe("the demo at the exhibition, 10 am to 2 pm on Thursday 29 October", () => {
  it("never clashes anything on the week, whenever it opens: the only clash is Sam's ask with tonight's study", () => {
    for (const t of EXHIBITION) {
      const d = demoWeek(t);
      expect(cleanData(d), t.toISOString()).not.toBeNull();
      expect(clashes(d), t.toISOString()).toEqual([]);
    }
  });

  it("shows the shift that just ended with the same times on the calendar and the watch, whenever it opens", () => {
    for (const t of EXHIBITION) {
      const d = demoWeek(t);
      const just = [...d.shifts].sort((a, b) => `${b.date} ${b.end}`.localeCompare(`${a.date} ${a.end}`))[0];
      const sinceEnd = (t.getTime() - instantOf(just.date, just.end, "Australia/Brisbane")) / 60_000;
      expect(just.date, t.toISOString()).toBe("2026-10-29");
      expect(sinceEnd, t.toISOString()).toBeGreaterThanOrEqual(20);
      expect(sinceEnd, t.toISOString()).toBeLessThan(35);
      expect(minutes(just.end) - minutes(just.start)).toBe(4 * 60);
      expect(just.body!.stress).toHaveLength(blockCount(just));
      expect(just.body!.heart).toHaveLength(blockCount(just));
      expect(Date.parse(just.body!.receivedAt)).toBeLessThanOrEqual(t.getTime());
      const w = watchSummary(d, t);
      const title = `Cafe, ${watchRange(just.start, just.end)}`;
      expect(w.checkIn, t.toISOString()).toEqual({ id: just.id, title });
      expect(w.lastShift?.id, t.toISOString()).toBe(just.id);
      expect(w.lastShift?.title).toBe(title);
      expect(w.ask).toMatchObject({ from: "Sam", when: "tonight", time: "5-10 pm" });
      expect(w.ask?.past).toBe("Last 4 at Cafe: not rated, Hard, Busy, Steady");
    }
  });

  it("keeps the same classes and plans every week, last week and next week too", () => {
    const d = demoWeek(LUNCH);
    const thisWeek = routine(d, THIS_WEEK).filter((x) => !x.endsWith("Study for the assignment"));
    expect(thisWeek.length).toBeGreaterThanOrEqual(7);
    expect(routine(d, addDays(THIS_WEEK, -7))).toEqual(thisWeek);
    expect(routine(d, addDays(THIS_WEEK, 7))).toEqual(thisWeek);
  });

  it("has this week's assignment and study only this week", () => {
    const d = demoWeek(LUNCH);
    expect(d.personal.filter((p) => p.title === "Study for the assignment").map((p) => p.date)).toEqual(["2026-10-29"]);
    expect(d.uni.filter((u) => u.type === "due").map((u) => [u.date, u.title])).toEqual([["2026-10-30", "Assignment"]]);
  });

  it("has rated shifts with readings last week, and none next week: shifts don't repeat like classes", () => {
    const d = demoWeek(LUNCH);
    const lastWeek = d.shifts.filter((s) => s.date >= addDays(THIS_WEEK, -7) && s.date < THIS_WEEK);
    expect(lastWeek.length).toBeGreaterThanOrEqual(2);
    for (const s of lastWeek) {
      expect(s.effort).toBeDefined();
      expect(s.body!.stress).toHaveLength(blockCount(s));
      expect(s.body!.heart).toHaveLength(blockCount(s));
    }
    expect(d.shifts.filter((s) => s.date >= addDays(THIS_WEEK, 7))).toEqual([]);
    // Every shift but the one that just ended is rated, and every one has readings.
    expect(d.shifts.filter((s) => !s.effort)).toHaveLength(1);
    expect(d.shifts.every((s) => s.body)).toBe(true);
  });
});
