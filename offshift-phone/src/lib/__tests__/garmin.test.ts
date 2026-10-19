import { describe, expect, it } from "vitest";
import { bodyCheck, bodyTile } from "@/lib/checks";
import { applyWatchAnswer, applyWatchBody, applyWatchHealth, ascii, parseHealth, stopWatchHealth, watchRange, watchSummary } from "@/lib/garmin";
import { emptyData } from "@/lib/session";
import { AT, NOW, ask, week } from "./fixture";

const asciiOnly = /^[\x20-\x7E]*$/;
function allStrings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(allStrings);
  if (v && typeof v === "object") return Object.values(v).flatMap(allStrings);
  return [];
}

describe("what the watch receives", () => {
  it("summarises the waiting ask in short plain-text lines", () => {
    const s = watchSummary(week(), AT);
    expect(s.ask).toMatchObject({ id: "o-thu", from: "Alex", employer: "Cafe", day: "Thu", when: "tonight", time: "4-9 pm", alt: "Fri 4-9 pm", swap: "Someone else", status: "pending", reminder: null });
    expect(s.ask!.week).toEqual(["7:30pm clash: Dinner with a friend", "60 min after Tutorial 3pm", "Fri starts 10am"]);
    expect(s.clock).toBe("13:02");
  });
  it("spaces the dash in a long time so the watch can break it cleanly, and leaves short ones alone", () => {
    expect(watchRange("10:30", "12:45")).toBe("10:30 am - 12:45 pm");
    expect(watchRange("16:00", "21:00")).toBe("4-9 pm");
  });
  it("only ever sends characters a watch font can draw", () => {
    for (const str of allStrings(watchSummary(week(), AT))) expect(str).toMatch(asciiOnly);
  });
  it("lists today's plans for the week page, in the order they happen", () => {
    expect(watchSummary(week(), AT).today).toEqual(["1pm Tutorial", "7:30pm Dinner with a friend"]);
  });
  it("shows the oldest waiting ask first and has nothing to show in a new session", () => {
    const later = ask({ id: "o-sat", date: "2026-10-24", sentAt: "2026-10-22T03:00:00.000Z" });
    expect(watchSummary({ ...week(), offers: [later, ask()] }, AT).ask?.id).toBe("o-thu");
    expect(watchSummary(emptyData(AT), AT)).toMatchObject({ ask: null, today: [], waiting: 0, replied: null });
  });
  it("never sends money or the old demo names", () => {
    expect(JSON.stringify(watchSummary(week(), AT))).not.toMatch(/\$|rent|essentials|Dinda|Jess|Pandora/i);
  });
});

describe("answers from the wrist", () => {
  it("declining from the watch records the drafted reply and clears the ask", () => {
    const r = applyWatchAnswer(week(), "o-thu", "decline", AT)!;
    expect(r.data.messages.at(-1)?.text).toContain("I can't do tonight");
    const s = watchSummary(r.data, AT);
    expect(s.ask).toBeNull();
    expect(s.replied).toMatchObject({ from: "Alex", status: "Declined" });
  });
  it("deciding later keeps the ask on the watch with its reminder time", () => {
    const s = watchSummary(applyWatchAnswer(week(), "o-thu", "later", AT)!.data, AT);
    expect(s.ask).toMatchObject({ status: "deferred", reminder: "1:32 pm" });
  });
});

describe("body readings from an older watch build", () => {
  it("stores a word, never the raw number, and the calendar shows it", () => {
    const data = applyWatchBody(week(), 1, AT);
    expect(data.wearable).toMatchObject({ level: 1, word: "Running low", at: "13:02" });
    expect(JSON.stringify(data.wearable)).not.toMatch(/battery|stress|heart/i);
    expect(bodyTile(data, NOW).label).toBe("Running low");
  });
  it("logs a change once, and ignores readings it can't trust", () => {
    const once = applyWatchBody(week(), 2, AT);
    expect(applyWatchBody(once, 2, AT)).toBe(once);
    expect(applyWatchBody(week(), 7, AT).wearable).toBeNull();
  });
});

describe("health readings from the watch", () => {
  const reading = { energy: 1, sleep: 1, stress: 1, heart: 3, breathing: 2, pulseOx: 3, recovery: 3 } as const;

  it("keeps a level per signal and no raw numbers", () => {
    const data = applyWatchHealth(week(), reading, "21:02", AT);
    expect(data.wearable).toMatchObject({ level: 1, word: "Running low", at: "21:02", source: "Garmin" });
    expect(Object.values(data.wearable!.signals!).every((v) => Number.isInteger(v) && v >= 0 && v <= 3)).toBe(true);
  });
  it("names the low signals on the calendar and in the ask's body check", () => {
    const data = applyWatchHealth(week(), reading, "21:02", AT);
    expect(bodyTile(data, NOW).detail).toContain("From your watch at 9:02 pm. A poor night's sleep and medium stress.");
    expect(bodyCheck(ask({ date: "2026-10-24", start: "18:00", end: "20:00" }), data, NOW).text).toMatch(/^Your watch reads running low, with a poor night's sleep and medium stress\. /);
  });
  it("keeps the last reading when the watch sends no Body Battery, and logs only word changes", () => {
    const once = applyWatchHealth(week(), reading, "21:02", AT);
    expect(applyWatchHealth(once, { sleep: 0, stress: 1 }, "21:07", AT)).toBe(once);
    expect(applyWatchHealth(once, { ...reading, stress: 2 }, "21:12", AT).sync).toHaveLength(once.sync.length);
    expect(applyWatchHealth(once, { ...reading, energy: 2 }, "21:17", AT).sync.at(-1)!.text).toBe("Body reading: steady. Kept private.");
  });
  it("forgets the reading when sharing is turned off on the watch", () => {
    const off = stopWatchHealth(applyWatchHealth(week(), reading, "21:02", AT), AT);
    expect(off.wearable).toBeNull();
    expect(stopWatchHealth(off, AT)).toBe(off);
  });
});

describe("reading what the watch sends", () => {
  it("keeps known signals with levels 0 to 3 and drops the rest", () => {
    expect(parseHealth({ energy: 2, sleep: 9, mood: 1, stress: "1", heart: 1.5, pulseOx: null, at: "21:02" })).toEqual({ signals: { energy: 2 }, at: "21:02" });
  });
  it("understands a request to stop sharing, and refuses anything unusable", () => {
    expect(parseHealth({ share: false })).toEqual({ share: false });
    expect(parseHealth({ mood: 1 })).toBeNull();
    expect(parseHealth("energy")).toBeNull();
    expect(parseHealth({ energy: 1, at: "late" })).toEqual({ signals: { energy: 1 }, at: null });
  });
});

describe("watch text and order", () => {
  it("keeps names readable without accents, and never empty", () => {
    expect(ascii("Zoë at Café Nº1, Łódź")).toBe("Zoe at Cafe No1, Lodz");
    const s = watchSummary({ ...week(), offers: [ask({ from: "张伟", workplace: "Café" })] }, AT);
    expect(s.ask).toMatchObject({ from: "Your manager", employer: "Cafe" });
  });
  it("shows a new ask before one the worker is deciding later", () => {
    const deferred = ask({ id: "o-old", status: "deferred", sentAt: "2026-10-22T01:00:00.000Z", reminderAt: "2026-10-22T04:00:00.000Z" });
    expect(watchSummary({ ...week(), offers: [deferred, ask()] }, AT).ask?.id).toBe("o-thu");
  });
  it("forgets the logged readings too when sharing is turned off", () => {
    const shared = applyWatchHealth(week(), { energy: 1 }, "21:02", AT);
    expect(shared.sync.some((e) => e.text.startsWith("Body reading"))).toBe(true);
    expect(stopWatchHealth(shared, AT).sync.some((e) => e.text.startsWith("Body reading"))).toBe(false);
  });
  it("stamps when a reading arrived, and refreshes it only now and then", () => {
    const first = applyWatchHealth(week(), { energy: 2 }, "21:02", AT);
    expect(first.wearable?.receivedAt).toBe(AT.toISOString());
    expect(applyWatchHealth(first, { energy: 2 }, "21:07", new Date(AT.getTime() + 5 * 60_000))).toBe(first);
    expect(applyWatchHealth(first, { energy: 2 }, "21:40", new Date(AT.getTime() + 40 * 60_000)).wearable?.receivedAt).toBe(new Date(AT.getTime() + 40 * 60_000).toISOString());
  });
});
