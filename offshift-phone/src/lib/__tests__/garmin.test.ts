import { describe, expect, it } from "vitest";
import { demoWeek } from "@/lib/demo";
import { applyWatchAnswer, ascii, watchRange, watchSummary } from "@/lib/garmin";
import { emptyData } from "@/lib/session";
import { forgetShiftBodies } from "@/lib/shift-body";
import { instantOf } from "@/lib/time";
import { AT, ask, week } from "./fixture";

const LUNCH = new Date(instantOf("2026-10-29", "13:00", "Australia/Brisbane"));

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
    expect(s.ask).toMatchObject({ id: "o-thu", from: "Alex", employer: "Cafe", day: "Thu", when: "tonight", time: "4-9 pm", alt: "Not offered", swap: "No one", status: "pending", reminder: null });
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
  it("names the latest finished shift with readings for the Last shift page, and nothing without one", () => {
    const d = demoWeek(LUNCH);
    const latest = [...d.shifts].sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`))[0];
    // Whatever order the week stores its shifts in.
    expect(watchSummary({ ...d, shifts: [...d.shifts].reverse() }, LUNCH).lastShift?.id).toBe(latest.id);
    // Sharing turned off forgets the readings, so there is no last shift to show.
    expect(watchSummary(forgetShiftBodies(d, LUNCH), LUNCH).lastShift).toBeNull();
    expect(watchSummary(emptyData(AT), AT).lastShift).toBeNull();
  });
  it("never sends money or the old demo names", () => {
    expect(JSON.stringify(watchSummary(week(), AT))).not.toMatch(/\$|rent|essentials|Dinda|Jess|Pandora/i);
  });
});

describe("answers from the wrist", () => {
  it("declining from the watch sends no message and clears the ask", () => {
    const r = applyWatchAnswer(week(), "o-thu", "decline", AT)!;
    expect(r.data.messages).toEqual(week().messages);
    const s = watchSummary(r.data, AT);
    expect(s.ask).toBeNull();
    expect(s.replied).toMatchObject({ from: "Alex", status: "Declined" });
  });
  it("deciding later keeps the ask on the watch, marked as kept for later", () => {
    const s = watchSummary(applyWatchAnswer(week(), "o-thu", "later", AT)!.data, AT);
    expect(s.ask).toMatchObject({ status: "deferred", reminder: "later" });
  });
});

describe("watch text and order", () => {
  it("keeps names readable without accents, and never empty", () => {
    expect(ascii("Zoë at Café Nº1, Łódź")).toBe("Zoe at Cafe No1, Lodz");
    const s = watchSummary({ ...week(), offers: [ask({ from: "张伟", workplace: "Café" })] }, AT);
    expect(s.ask).toMatchObject({ from: "Your manager", employer: "Cafe" });
  });
  it("shows a new ask before one the worker is deciding later", () => {
    const deferred = ask({ id: "o-old", status: "deferred", sentAt: "2026-10-22T01:00:00.000Z" });
    expect(watchSummary({ ...week(), offers: [deferred, ask()] }, AT).ask?.id).toBe("o-thu");
  });
});
