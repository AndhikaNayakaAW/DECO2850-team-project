import { describe, expect, it } from "vitest";
import { bodyTile } from "@/lib/checks";
import { seedData } from "@/lib/scenario";
import { applyWatchAnswer, applyWatchBody, watchSummary } from "@/lib/garmin";

const ascii = /^[\x20-\x7E]*$/;
function allStrings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(allStrings);
  if (v && typeof v === "object") return Object.values(v).flatMap(allStrings);
  return [];
}

describe("what the watch receives", () => {
  it("summarises Jess's ask in short plain-text lines", () => {
    const s = watchSummary(seedData());
    expect(s.ask).toMatchObject({ id: "o-jess-thu", from: "Jess", employer: "Pandora", when: "tonight", time: "4-9 pm", alt: "Fri 8-10 am", swap: "Priya", status: "pending" });
    expect(s.ask!.week.join(" | ")).toContain("Dinner with Ayu");
    expect(s.ask!.week.join(" | ")).toContain("25 min spare");
    expect(s.ask!.week.length).toBeLessThanOrEqual(3);
  });
  it("only ever sends characters a watch font can draw", () => {
    for (const str of allStrings(watchSummary(seedData()))) expect(str).toMatch(ascii);
  });
  it("leaves money out entirely", () => {
    expect(JSON.stringify(watchSummary(seedData()))).not.toMatch(/\$|rent|essentials/i);
  });
});

describe("answers from the wrist", () => {
  it("declining from the watch sends the drafted reply and clears the ask", () => {
    const r = applyWatchAnswer(seedData(), "o-jess-thu", "decline")!;
    expect(r.data.messages.at(-1)?.text).toContain("I can't do tonight");
    const s = watchSummary(r.data);
    expect(s.ask).toBeNull();
    expect(s.replied).toMatchObject({ from: "Jess", status: "Declined" });
  });
  it("deciding later keeps the ask on the watch with its reminder", () => {
    const s = watchSummary(applyWatchAnswer(seedData(), "o-jess-thu", "later")!.data);
    expect(s.ask).toMatchObject({ status: "deferred", reminder: "13:32" });
  });
});

describe("body readings from the watch", () => {
  it("stores a word, never the raw number, and the calendar shows it", () => {
    const data = applyWatchBody(seedData(), 1);
    expect(data.wearable).toMatchObject({ level: 1, word: "Running low" });
    expect(JSON.stringify(data.wearable)).not.toMatch(/battery|stress|heart/i);
    expect(bodyTile(data).label).toBe("Running low");
  });
  it("logs a change once, not on every check", () => {
    const once = applyWatchBody(seedData(), 2);
    const twice = applyWatchBody(once, 2);
    expect(twice.sync).toHaveLength(once.sync.length);
    expect(twice).toBe(once);
  });
  it("ignores readings it can't trust", () => {
    const data = seedData();
    expect(applyWatchBody(data, 7)).toBe(data);
    expect(applyWatchBody(data, Number.NaN)).toBe(data);
  });
});
