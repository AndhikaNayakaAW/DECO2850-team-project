import { describe, expect, it } from "vitest";
import { parseWatchExport, readingDate, readingsAround, recoveryPreview, demoReadings, type WatchReading } from "@/lib/watch";

const packet = {
  version: 1,
  device: "Garmin test watch",
  readings: [{ id: "hr-1", recordedAt: "2026-09-16T14:20:00+10:00", bpm: 96 }],
};
const receivedAt = "2026-10-15T02:00:00+10:00";

describe("watch import contract", () => {
  it("marks exports as imported, retaining recorded time, source and receipt time", () => {
    expect(parseWatchExport(packet, receivedAt)).toEqual([{
      id: "hr-1", recordedAt: packet.readings[0].recordedAt, bpm: 96,
      source: "Garmin test watch", origin: "imported", receivedAt,
    }]);
  });
  it.each([
    null,
    { ...packet, version: 2 },
    { ...packet, device: "" },
    { ...packet, readings: [] },
    { ...packet, readings: [{ ...packet.readings[0], bpm: "96" }] },
    { ...packet, readings: [{ ...packet.readings[0], bpm: -1 }] },
    { ...packet, readings: [{ ...packet.readings[0], recordedAt: "2026-09-16T14:20:00" }] },
    { ...packet, readings: [packet.readings[0], packet.readings[0]] },
  ])("rejects invalid or ambiguous exports without guessing their meaning", (input) => {
    expect(() => parseWatchExport(input, receivedAt)).toThrow();
  });
  it("sorts imported samples by their recording time and strips untrusted metadata", () => {
    const parsed = parseWatchExport({ ...packet, readings: [
      { id: "later", recordedAt: "2026-09-16T17:00:00+10:00", bpm: 76, stress: "work caused this" },
      packet.readings[0],
    ] }, receivedAt);
    expect(parsed.map((r) => r.id)).toEqual(["hr-1", "later"]);
    expect(parsed[1]).not.toHaveProperty("stress");
    expect(parsed.every((r) => r.origin === "imported")).toBe(true);
  });
  it("keeps demo provenance explicit on every fixture reading", () => {
    expect(demoReadings.length).toBeGreaterThan(0);
    expect(demoReadings.every((r) => r.origin === "demo" && r.source.includes("Demo"))).toBe(true);
  });
});

describe("calendar context", () => {
  it("groups readings by the actual Brisbane date rather than a repeating weekday", () => {
    expect(readingDate("2026-09-15T15:00:00Z")).toBe("2026-09-16");
    expect(readingDate("2026-09-16T23:00:00-04:00")).toBe("2026-09-17");
  });
  it("shows readings during and within 30 minutes of the selected shift", () => {
    const result = readingsAround(demoReadings, { date: "2026-09-16", start: "12:00", end: "16:00" });
    expect(result.map((r) => r.bpm)).toEqual([74, 89, 96, 91, 82]);
    expect(readingsAround(demoReadings, { date: "2026-09-17", start: "12:00", end: "16:00" })).toEqual([]);
  });
  it("matches readings around an overnight activity without losing the next-day samples", () => {
    const sample: WatchReading = { id: "night", recordedAt: "2026-09-17T01:00:00+10:00", bpm: 80, source: "Test watch", origin: "imported", receivedAt };
    expect(readingsAround([sample], { date: "2026-09-16", start: "22:00", end: "02:00" })).toEqual([sample]);
  });
  it("previews recovery time after a shift, rolling into the next date when needed", () => {
    expect(recoveryPreview({ date: "2026-09-16", start: "12:00", end: "16:00" })).toEqual({ date: "2026-09-16", start: "16:30", end: "17:00", title: "Recovery time" });
    expect(recoveryPreview({ date: "2026-09-20", start: "22:00", end: "02:00" })).toEqual({ date: "2026-09-21", start: "02:30", end: "03:00", title: "Recovery time" });
  });
});
