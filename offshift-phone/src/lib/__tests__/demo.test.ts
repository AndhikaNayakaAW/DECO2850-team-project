import { describe, expect, it } from "vitest";
import { demoWeek } from "../demo";
import { applyEffort } from "../effort";
import { watchSummary } from "../garmin";
import { describeSignal } from "../shift-body";
import { instantOf } from "../time";
import { cleanData } from "../validate";

const at = (date: string, time: string) => new Date(instantOf(date, time, "Australia/Brisbane"));
const LUNCH = at("2026-10-29", "13:00");
const EVENING = at("2026-10-29", "17:30");

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
    expect(watchSummary(d, LUNCH).ask?.past).toBe("Last 3 at Cafe: not rated, Hard, Busy");
    const rated = applyEffort(d, watchSummary(d, LUNCH).checkIn!.id, "hard", LUNCH)!.data;
    expect(watchSummary(rated, LUNCH).ask?.past).toBe("Last 3 at Cafe: Hard, Hard, Busy");
  });

  it("puts the next morning's lecture in the ask's week lines", () => {
    // Thursday 29 October: the ask is tonight, Friday starts with a 9 am lecture.
    expect(watchSummary(demoWeek(LUNCH), LUNCH).ask?.week).toContain("Fri starts 9am");
  });
});
