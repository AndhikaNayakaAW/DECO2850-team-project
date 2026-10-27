import { describe, expect, it } from "vitest";
import { dayItems } from "@/lib/checks";
import { watchSummary } from "@/lib/garmin";
import { quietUntil } from "@/lib/quiet";
import type { DataSlice } from "@/lib/types";
import { ask, week } from "./fixture";

/** Tuesday 20 October 2026 in Brisbane, during the 4 to 9 pm Café shift. */
const ON_SHIFT = new Date("2026-10-20T07:30:00Z");
const AFTER_SHIFT = new Date("2026-10-20T11:01:00Z");
const onShift = { date: "2026-10-20", time: "17:30" };

describe("an ask that arrives during a shift waits to buzz the watch until the shift ends", () => {
  it("holds a new ask while the worker is on a rostered shift, and says until when", () => {
    expect(watchSummary(week(), ON_SHIFT).ask).toMatchObject({ id: "o-thu", quiet: "9 pm" });
    expect(quietUntil(ask(), week(), onShift)).toBe("21:00");
  });

  it("lets the watch buzz once the shift has ended", () => {
    expect(watchSummary(week(), AFTER_SHIFT).ask!.quiet).toBeNull();
  });

  it("holds nothing when the worker is not on a shift", () => {
    expect(watchSummary(week(), new Date("2026-10-22T03:02:00Z")).ask!.quiet).toBeNull();
  });

  it("still buzzes straight away for an ask that starts before the shift ends, like staying back tonight", () => {
    const stayBack: DataSlice = { ...week(), offers: [ask({ date: "2026-10-20", start: "20:00", end: "22:00" })] };
    expect(watchSummary(stayBack, ON_SHIFT).ask!.quiet).toBeNull();
  });

  it("follows a shift that runs past midnight", () => {
    const nights: DataSlice = { ...week(), shifts: [{ id: "s-night", date: "2026-10-21", start: "22:00", end: "06:00", workplace: "Supermarket" }] };
    expect(quietUntil(ask(), nights, { date: "2026-10-22", time: "02:00" })).toBe("06:00");
    expect(quietUntil(ask(), nights, { date: "2026-10-22", time: "06:00" })).toBeNull();
  });

  it("holds only a new ask: one kept for later was already seen", () => {
    expect(quietUntil(ask({ status: "deferred" }), week(), onShift)).toBeNull();
  });

  it("never hides the ask from the calendar", () => {
    expect(dayItems(week(), "2026-10-22").some((it) => it.offerId === "o-thu")).toBe(true);
  });
});
