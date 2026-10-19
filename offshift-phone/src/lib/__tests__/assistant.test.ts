import { describe, expect, it } from "vitest";
import { BRIEF, greeting, openingLines, scriptedTurn } from "@/lib/assistant";
import { initialOffers, initialPersonal, initialSettings, initialShifts, initialUni } from "@/lib/scenario";
import { forSpeech } from "@/lib/speech";

const state = () => ({ clock: "13:02", shifts: structuredClone(initialShifts), uni: structuredClone(initialUni), personal: structuredClone(initialPersonal), offers: structuredClone(initialOffers), settings: structuredClone(initialSettings) });

describe("the scripted voice", () => {
  it("greets by the clock", () => {
    expect(greeting("08:00")).toBe("Good morning");
    expect(greeting("13:02")).toBe("Good afternoon");
    expect(greeting("19:00")).toBe("Good evening");
  });
  it("briefs the day and ends on a question", () => {
    const r = scriptedTurn(BRIEF, state());
    expect(r.text).toMatch(/^Good afternoon, Dinda/);
    expect(r.text).toContain("Jess from Pandora");
    expect(r.text.trim().endsWith("?")).toBe(true);
    expect(r.actions).toEqual([]);
  });
  it("describes a named day and brings it into view", () => {
    const r = scriptedTurn("what's on saturday", state());
    expect(r.text).toContain("Saturday has");
    expect(r.actions).toEqual([{ type: "show_day", day: "Sat" }]);
  });
  it("turns a decision into a respond action", () => {
    const r = scriptedTurn("not tonight", state());
    expect(r.actions[0]).toMatchObject({ type: "respond", decision: "decline" });
    expect(r.text).toContain("Done");
    expect(scriptedTurn("I'll take it", state()).actions[0]).toMatchObject({ decision: "accept" });
    expect(scriptedTurn("remind me later", state()).actions[0]).toMatchObject({ decision: "later" });
  });
  it("opens with the date, today's items and the waiting ask", () => {
    const lines = openingLines(state());
    expect(lines[0]).toBe("Good afternoon, Dinda. It's Thursday the 17th of September.");
    expect(lines[1]).toContain("Today we have");
    expect(lines[2]).toContain("Jess from Pandora has asked");
  });
  it("says what the watch reads, in words, once the worker shares it", () => {
    const wearable = { level: 1 as const, word: "Running low", at: "07:10", source: "Garmin", signals: { energy: 1 as const, sleep: 1 as const } };
    const lines = openingLines({ ...state(), wearable });
    expect(lines[2]).toBe("Your watch reads running low, with a poor night's sleep.");
    expect(lines[3]).toContain("Jess from Pandora has asked");
    expect(openingLines({ ...state(), wearable: null }).join(" ")).not.toContain("watch");
  });
});

describe("speech text", () => {
  it("reads ranges and sources aloud cleanly", () => {
    expect(forSpeech("Dinner, 7:30–9:30 pm (Calendar) · Offshift")).toBe("Dinner, 7:30 to 9:30 pm, Offshift");
  });
});
