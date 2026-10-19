import { describe, expect, it } from "vitest";
import { bodyCheck, bodyTile } from "@/lib/checks";
import { seedData } from "@/lib/scenario";
import { applyWatchAnswer, applyWatchBody, applyWatchHealth, parseHealth, stopWatchHealth, watchSummary } from "@/lib/garmin";

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

describe("health readings from the watch", () => {
  const reading = { energy: 1, sleep: 1, stress: 1, heart: 3, breathing: 2, pulseOx: 3, recovery: 3 } as const;
  const jess = (data: ReturnType<typeof seedData>) => data.offers.find((o) => o.id === "o-jess-thu")!;

  it("keeps a word per signal and no raw numbers", () => {
    const data = applyWatchHealth(seedData(), reading, "21:02");
    expect(data.wearable).toMatchObject({ level: 1, word: "Running low", at: "21:02", source: "Garmin" });
    expect(Object.values(data.wearable!.signals!).every((v) => Number.isInteger(v) && v >= 0 && v <= 3)).toBe(true);
    expect(JSON.stringify(data.wearable)).not.toMatch(/bpm|score|%|battery/i);
  });
  it("names the low signals in plain words on the calendar", () => {
    const tile = bodyTile(applyWatchHealth(seedData(), reading, "21:02"));
    expect(tile.label).toBe("Running low");
    expect(tile.detail).toContain("From your watch at 9:02 pm.");
    expect(tile.detail).toContain("A poor night's sleep and medium stress.");
  });
  it("brings them into the ask's body check without judging the shift", () => {
    const data = applyWatchHealth(seedData(), { ...reading, energy: 3 }, "21:02");
    const c = bodyCheck(jess(data), data);
    expect(["warn", "bad"]).toContain(c.state);
    expect(c.text).toMatch(/^Your watch reads plenty of energy, with a poor night's sleep and medium stress\. /);
    expect(c.text).not.toMatch(/should|don't take|take it/i);
  });
  it("keeps the last reading when the watch sends no Body Battery", () => {
    const on = applyWatchHealth(seedData(), reading, "21:02");
    expect(applyWatchHealth(on, { sleep: 0, stress: 1 }, "21:07")).toBe(on);
    expect(applyWatchHealth(seedData(), { sleep: 0, stress: 1 }, "21:07").wearable).toBeNull();
  });
  it("logs the reading once, and again only when the word changes", () => {
    const once = applyWatchHealth(seedData(), reading, "21:02");
    expect(once.sync.at(-1)!.text).toBe("Body reading: running low. Kept private.");
    expect(applyWatchHealth(once, reading, "21:07")).toBe(once);
    const quieter = applyWatchHealth(once, { ...reading, stress: 2 }, "21:12");
    expect(quieter.sync).toHaveLength(once.sync.length);
    expect(quieter.wearable!.signals!.stress).toBe(2);
    const changed = applyWatchHealth(once, { ...reading, energy: 2 }, "21:17");
    expect(changed.sync).toHaveLength(once.sync.length + 1);
    expect(changed.sync.at(-1)!.text).toBe("Body reading: steady. Kept private.");
  });
  it("forgets the reading when sharing is turned off on the watch", () => {
    const on = applyWatchHealth(seedData(), reading, "21:02");
    const off = stopWatchHealth(on);
    expect(off.wearable).toBeNull();
    expect(off.sync.at(-1)!.text).toBe("Body sharing turned off on the watch. The calendar forgot the last reading.");
    expect(stopWatchHealth(off)).toBe(off);
  });
});

describe("reading what the watch sends", () => {
  it("keeps known signals with levels 0 to 3 and drops the rest", () => {
    expect(parseHealth({ energy: 2, sleep: 9, mood: 1, stress: "1", heart: 1.5, pulseOx: null, at: "21:02" })).toEqual({ signals: { energy: 2 }, at: "21:02" });
  });
  it("understands a request to stop sharing", () => {
    expect(parseHealth({ share: false })).toEqual({ share: false });
  });
  it("refuses anything without a usable reading", () => {
    expect(parseHealth({ mood: 1 })).toBeNull();
    expect(parseHealth("energy")).toBeNull();
    expect(parseHealth(null)).toBeNull();
  });
  it("ignores a time it can't read", () => {
    expect(parseHealth({ energy: 1, at: "late" })).toEqual({ signals: { energy: 1 }, at: null });
  });
});
