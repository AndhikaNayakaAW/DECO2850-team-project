import { describe, expect, it } from "vitest";
import { offerChecks } from "@/lib/checks";
import { watchSummary } from "@/lib/garmin";
import { pastCheck, pastShifts } from "@/lib/past-shifts";
import type { DataSlice, Effort, Load, Shift } from "@/lib/types";
import { AT, NOW, ask, week } from "./fixture";

/** Twenty 15-minute blocks of a five-hour shift, with high stress (3) in the blocks named. */
function blocks(high: number[] = [], base: Load = 1): (Load | null)[] {
  return Array.from({ length: 20 }, (_, i) => (high.includes(i) ? 3 : base));
}
const read = (stress: (Load | null)[]) => ({ receivedAt: AT.toISOString(), stress, heart: blocks([], 1) });
function shifts(patches: Record<string, Partial<Shift>>): DataSlice {
  const w = week();
  return { ...w, shifts: w.shifts.map((s) => (patches[s.id] ? { ...s, ...patches[s.id] } : s)) };
}
/** Monday and Tuesday at the Café, both read by the watch, with high stress in the last hour or so. */
const history = () => shifts({ "s-mon": { effort: "busy", body: read(blocks([16, 17, 18])) }, "s-tue": { effort: "hard", body: read(blocks([15, 16, 17, 18, 19])) } });

describe("how shifts like this one went", () => {
  it("finds the worker's finished shifts at the same workplace, most recent first", () => {
    expect(pastShifts(ask(), history(), NOW).map((s) => s.id)).toEqual(["s-tue", "s-mon"]);
  });

  it("matches the workplace whatever its case or spacing", () => {
    expect(pastShifts(ask({ workplace: " café " }), history(), NOW).map((s) => s.id)).toEqual(["s-tue", "s-mon"]);
  });

  it("leaves out shifts still to come, other workplaces, the shift booked from this ask, and shifts with nothing to show", () => {
    const data = { ...history(), shifts: [...history().shifts, { id: "s-booked", date: "2026-10-21", start: "16:00", end: "21:00", workplace: "Café", viaOffer: "o-thu", effort: "light" as Effort }] };
    expect(pastShifts(ask(), data, NOW).map((s) => s.id)).toEqual(["s-tue", "s-mon"]);
    expect(pastShifts(ask(), week(), NOW).map((s) => s.id)).toEqual(["s-tue"]);
  });

  it("keeps to the last four", () => {
    const many = Array.from({ length: 6 }, (_, i): Shift => ({ id: `s-${i}`, date: `2026-10-0${i + 1}`, start: "16:00", end: "21:00", workplace: "Café", effort: "steady" }));
    expect(pastShifts(ask(), { ...week(), shifts: many }, NOW).map((s) => s.id)).toEqual(["s-5", "s-4", "s-3", "s-2"]);
  });
});

describe("the past shifts check on an ask", () => {
  it("says how they went and what the watch read, in plain words", () => {
    expect(pastCheck(ask(), history(), NOW)).toEqual({ key: "past", state: "info", text: "Your last two shifts at Café: Hard and Busy. Your watch read high stress in both, mostly near the end." });
  });

  it("says only the rating when the watch didn't read the shift", () => {
    expect(pastCheck(ask(), week(), NOW).text).toBe("Your last shift at Café: Hard.");
  });

  it("counts a shift that wasn't rated, and one the watch didn't read", () => {
    const mixed = shifts({ "s-mon": { body: read(blocks()) }, "s-tue": { effort: "busy" } });
    expect(pastCheck(ask(), mixed, NOW).text).toBe("Your last two shifts at Café: Busy, and one you didn't rate. Your watch read one of them, with no high stress.");
  });

  it("says when there is nothing to compare with yet", () => {
    expect(pastCheck(ask({ workplace: "Bar" }), week(), NOW).text).toBe("Nothing to compare yet. Rate your shifts at Bar on your watch and they show here.");
  });

  it("never advises or grades", () => {
    const cases = [history(), week(), shifts({ "s-mon": { body: read(blocks()) }, "s-tue": { effort: "busy" } }), shifts({ "s-tue": { effort: "light", body: read(blocks([0, 1])) } })];
    for (const data of cases) {
      const c = pastCheck(ask(), data, NOW);
      expect(c.state).toBe("info");
      expect(c.text).not.toMatch(/should|too |need|avoid|careful|bad|good|healthy|risk|don't take|say no/i);
    }
  });

  it("is the third check on every ask, after Body and Week", () => {
    expect(offerChecks(ask(), history(), NOW).map((c) => c.key)).toEqual(["body", "week", "past"]);
  });

  it("puts the same comparison on the watch, in plain text", () => {
    expect(watchSummary(history(), AT).ask?.past).toBe("Last 2 at Cafe: Hard, Busy");
    expect(watchSummary(week(), AT).ask?.past).toBe("Last at Cafe: Hard");
    expect(watchSummary(shifts({ "s-tue": { effort: undefined } }), AT).ask?.past).toBeNull();
  });
});
