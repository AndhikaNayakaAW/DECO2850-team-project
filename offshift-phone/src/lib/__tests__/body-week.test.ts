import { describe, expect, it } from "vitest";
import { BAND_COLOUR, BAND_SIGNALS, bodyBand } from "@/lib/body-week";
import { applyWatchHealth, stopWatchHealth } from "@/lib/garmin";
import { mergeData } from "@/lib/merge";
import { teamView } from "@/lib/team";
import type { DataSlice } from "@/lib/types";
import { cleanData } from "@/lib/validate";
import { AT, week } from "./fixture";

const WEEK = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"];
/** Tuesday evening, Wednesday evening and Thursday lunchtime readings, as the watch would send them. */
function shared(): DataSlice {
  let d = week();
  d = applyWatchHealth(d, { energy: 3, sleep: 3, stress: 3, heart: 3 }, "20:00", new Date("2026-10-20T10:00:00Z"));
  d = applyWatchHealth(d, { energy: 1, sleep: 1, stress: 0, heart: 1 }, "21:00", new Date("2026-10-21T11:00:00Z"));
  d = applyWatchHealth(d, { energy: 2, sleep: 2, stress: 2, heart: 3 }, "13:00", AT);
  return d;
}
const band = (data: DataSlice, signal: Parameters<typeof bodyBand>[2] = "energy", at: Date = AT) => bodyBand(data, WEEK, signal, at);

describe("the watch's readings, day by day", () => {
  it("keeps the latest reading of each day the worker shared", () => {
    expect(shared().bodyDays?.map((d) => [d.date, d.signals.energy])).toEqual([
      ["2026-10-20", 3],
      ["2026-10-21", 1],
      ["2026-10-22", 2],
    ]);
  });

  it("forgets every day as soon as sharing is turned off", () => {
    expect(stopWatchHealth(shared(), AT).bodyDays).toEqual([]);
  });

  it("never shows the readings to the team", () => {
    expect(JSON.stringify(teamView(shared(), 1, null))).not.toMatch(/bodyDays|energy|stress/i);
  });

  it("survives saving and syncing, and refuses a level the watch can't send", () => {
    const d = shared();
    expect(cleanData(d)?.bodyDays).toHaveLength(3);
    expect(cleanData({ ...d, bodyDays: [{ date: "2026-10-22", at: "13:00", receivedAt: AT.toISOString(), signals: { energy: 7 } }] })).toBeNull();
    expect(mergeData(week(), d, week()).bodyDays).toHaveLength(3);
  });
});

describe("a band along the floor of each day", () => {
  it("shows nothing at all for a worker who never shared", () => {
    expect(band(week())).toEqual([]);
  });

  it("marks a day with no reading differently from a low reading", () => {
    const b = band(shared());
    expect(b.map((d) => d.state)).toEqual(["none", "reading", "reading", "reading", "none", "none", "none"]);
    expect(b[0].shade).toBeUndefined();
  });

  it("goes darker for more of what it names: more energy, more stress, heart further above usual", () => {
    expect(band(shared(), "energy").slice(1, 4).map((d) => d.shade)).toEqual([3, 1, 2]);
    expect(band(shared(), "stress").slice(1, 4).map((d) => d.shade)).toEqual([0, 3, 1]);
    expect(band(shared(), "heart").slice(1, 4).map((d) => d.shade)).toEqual([0, 2, 0]);
    expect(band(shared(), "stress")[2].word).toBe("High");
  });

  it("puts last night's recharge between the day before and the day it was measured", () => {
    const b = band(shared());
    expect(b.map((d) => d.overnight?.shade ?? null)).toEqual([null, 3, 1, 2, null, null, null]);
    expect(b[2].overnight?.word).toBe("Poor");
  });

  it("calls today's reading stale after 12 hours, without hiding it", () => {
    // Read at 7 am on Thursday, looked at 8 pm the same day.
    const morning = applyWatchHealth(week(), { energy: 2 }, "07:00", new Date("2026-10-21T21:00:00Z"));
    const late = band(morning, "energy", new Date("2026-10-22T10:00:00Z"));
    expect(late[3]).toMatchObject({ state: "stale", shade: 2 });
    expect(band(morning, "energy", new Date("2026-10-22T05:00:00Z"))[3].state).toBe("reading");
  });

  it("uses one neutral grey, evenly darker, and lets the worker choose the signal", () => {
    expect(BAND_SIGNALS).toEqual(["energy", "stress", "heart"]);
    expect(BAND_COLOUR).toEqual(["#E2E2DE", "#B9BAB4", "#8E908A", "#62645F"]);
  });
});
