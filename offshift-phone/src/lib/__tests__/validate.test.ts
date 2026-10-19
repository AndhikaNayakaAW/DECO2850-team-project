import { describe, expect, it } from "vitest";
import { exampleWeek } from "@/lib/session";
import { cleanData } from "@/lib/validate";
import { AT, week } from "./fixture";

describe("checking a week that arrives from outside", () => {
  it("accepts real weeks and returns only the fields Offshift knows", () => {
    expect(cleanData(week())).toEqual(week());
    expect(cleanData(exampleWeek(AT))).not.toBeNull();
    const extra = cleanData({ ...week(), respondToOffer: null, shifts: week().shifts.map((s) => ({ ...s, payRate: 31 })) })!;
    expect("respondToOffer" in extra).toBe(false);
    expect(extra.shifts.every((s) => !("payRate" in s))).toBe(true);
  });

  it("refuses anything malformed, whole", () => {
    const w = week();
    const bad: unknown[] = [
      null,
      "week",
      { ...w, schema: 1 },
      { ...w, settings: null },
      { ...w, shifts: [{ ...w.shifts[0], date: "22/10/2026" }] },
      { ...w, shifts: [{ ...w.shifts[0], start: "25:00" }] },
      { ...w, shifts: [w.shifts[0], w.shifts[0]] },
      { ...w, offers: [{ ...w.offers[0], status: "maybe" }] },
      { ...w, personal: [{ ...w.personal[0], title: "   " }] },
      { ...w, settings: { ...w.settings, timeZone: "Mars/Olympus" } },
      { ...w, settings: { ...w.settings, restDays: ["Sun", "Sun"] } },
      { ...w, wearable: { level: 9, word: "Fine", at: "12:00", source: "Garmin" } },
      { ...w, messages: Array.from({ length: 2001 }, (_, i) => ({ id: `m${i}`, from: "team", text: "hi", at: AT.toISOString() })) },
    ];
    for (const b of bad) expect(cleanData(b)).toBeNull();
  });

  it("treats a missing body reading as none", () => {
    const { wearable: _, ...rest } = week();
    expect(cleanData(rest)!.wearable).toBeNull();
  });
});
