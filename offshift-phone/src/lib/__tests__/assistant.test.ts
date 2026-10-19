import { describe, expect, it } from "vitest";
import { ANSWER, BRIEF, assistantContext, greeting, openingLines, scriptedTurn } from "@/lib/assistant";
import { emptyData } from "@/lib/session";
import { forSpeech } from "@/lib/speech";
import { AT, NOW, ask, week } from "./fixture";

describe("the scripted voice", () => {
  it("greets by the clock", () => {
    expect(greeting("08:00")).toBe("Good morning");
    expect(greeting("13:02")).toBe("Good afternoon");
    expect(greeting("19:00")).toBe("Good evening");
  });
  it("briefs the day by name and ends on a question", () => {
    const r = scriptedTurn(BRIEF, week(), NOW);
    expect(r.text).toMatch(/^Good afternoon, Sam\. Today you have your tutorial from 1 pm to 3 pm and dinner with a friend at 7:30 pm\. /);
    expect(r.text).toContain("Alex asked whether you could cover tonight at Café, 4 pm to 9 pm.");
    expect(r.text.trim().endsWith("?")).toBe(true);
    expect(r.actions).toEqual([]);
  });
  it("describes a named day and brings that date into view", () => {
    const r = scriptedTurn("what's on saturday", week(), NOW);
    expect(r.text).toBe("Saturday has a Supermarket shift from 9 am to 5 pm.");
    expect(r.actions).toEqual([{ type: "show_day", date: "2026-10-24" }]);
    expect(scriptedTurn("what about sunday", week(), NOW).text).toBe("Sunday is clear, and kept for rest.");
  });
  it("turns a decision into a draft for the worker to send, never a sent reply", () => {
    const r = scriptedTurn("not tonight", week(), NOW);
    expect(r.actions[0]).toMatchObject({ type: "respond", offerId: "o-thu", decision: "decline" });
    expect(r.text).toBe("Here's a kind no to Alex for tonight. Have a look, change anything you like, then press Send reply.");
    expect(scriptedTurn("I'll take it", week(), NOW).actions[0]).toMatchObject({ decision: "accept" });
    expect(scriptedTurn("remind me later", week(), NOW).actions[0]).toMatchObject({ decision: "later" });
  });
  it("understands no for any day, as the chips say it", () => {
    const fri = { ...week(), offers: [ask({ date: "2026-10-23", start: "10:00", end: "14:00" })] };
    expect(scriptedTurn("Not tomorrow.", fri, NOW).actions[0]).toMatchObject({ decision: "decline" });
    const sat = { ...week(), offers: [ask({ date: "2026-10-24" })] };
    expect(scriptedTurn("Not Saturday.", sat, NOW).actions[0]).toMatchObject({ decision: "decline" });
  });
  it("answers the ask for the day named, and reads friendly phrases as they're meant", () => {
    const two = { ...week(), offers: [ask(), ask({ id: "o-fri", date: "2026-10-23", start: "10:00", end: "14:00", sentAt: "2026-10-22T02:50:00.000Z" })] };
    expect(scriptedTurn("Not Friday.", two, NOW).actions[0]).toMatchObject({ offerId: "o-fri", decision: "decline" });
    expect(scriptedTurn("No worries, I'll take it", week(), NOW).actions[0]).toMatchObject({ decision: "accept" });
    expect(scriptedTurn("Yes, can't wait!", week(), NOW).actions[0]).toMatchObject({ decision: "accept" });
    expect(scriptedTurn("Yeah nah", week(), NOW).actions[0]).toMatchObject({ decision: "decline" });
    expect(scriptedTurn("Nah yeah, I'm in", week(), NOW).actions[0]).toMatchObject({ decision: "accept" });
  });
  it("answers the exact ask a chip names, and asks which one when it can't tell", () => {
    const later = ask({ id: "o-nov", date: "2026-11-05", start: "16:00", end: "21:00", sentAt: "2026-10-22T01:00:00.000Z" });
    const two = { ...week(), offers: [later, ask()] };
    expect(scriptedTurn(`${ANSWER}o-thu:decline`, two, NOW).actions[0]).toMatchObject({ offerId: "o-thu", decision: "decline" });
    expect(scriptedTurn("Not Thu 5 Nov", two, NOW).actions[0]).toMatchObject({ offerId: "o-nov" });
    expect(scriptedTurn("Not tonight", two, NOW).actions[0]).toMatchObject({ offerId: "o-thu" });
    const r = scriptedTurn("Not Friday.", two, NOW);
    expect(r.actions).toEqual([]);
    expect(r.text).toMatch(/^Which ask do you mean\?/);
    expect(scriptedTurn("Please don't take it", week(), NOW).actions[0]).toMatchObject({ decision: "decline" });
  });
  it("doesn't choose for a worker who isn't sure", () => {
    const r = scriptedTurn("Yes I'm wiped, maybe not", week(), NOW);
    expect(r.actions).toEqual([]);
    expect(r.text).toMatch(/^That's okay, there's no rush\./);
  });
  it("on a Sunday, tomorrow is the coming Monday", () => {
    const data = { ...week(), offers: [], shifts: [...week().shifts, { id: "s-next", date: "2026-10-26", start: "14:00", end: "18:00", workplace: "Library" }] };
    const r = scriptedTurn("What's on tomorrow?", data, { date: "2026-10-25", time: "10:00" });
    expect(r.text).toContain("Library");
    expect(r.actions).toEqual([{ type: "show_day", date: "2026-10-26" }]);
  });
  it("has nothing to push in an empty session, and never invents a name", () => {
    const r = scriptedTurn(BRIEF, emptyData(AT), NOW);
    expect(r.text).toBe("Good afternoon. Nothing is booked today. No one is asking anything of you.");
    expect(scriptedTurn("yes", emptyData(AT), NOW).actions).toEqual([]);
  });
});

describe("the opening words", () => {
  it("open with the real date, today's items and the waiting ask", () => {
    const lines = openingLines(week(), NOW);
    expect(lines).toEqual([
      "Good afternoon, Sam. It's Thursday the 22nd of October.",
      "Today we have your tutorial from 1 pm to 3 pm and dinner with a friend at 7:30 pm.",
      "Alex has asked whether you could cover tonight at Café, 4 pm to 9 pm. It's waiting for you.",
    ]);
  });
  it("say what the watch reads, in words, once the worker shares it", () => {
    const wearable = { level: 1 as const, word: "Running low", at: "07:10", source: "Garmin", signals: { energy: 1 as const, sleep: 1 as const } };
    const lines = openingLines({ ...week(), wearable }, NOW);
    expect(lines[2]).toBe("Your watch reads running low, with a poor night's sleep.");
    expect(lines[3]).toContain("Alex has asked");
    expect(openingLines(week(), NOW).join(" ")).not.toContain("watch");
  });
  it("greet a new participant without a name", () => {
    expect(openingLines(emptyData(AT), NOW)).toEqual(["Good afternoon. It's Thursday the 22nd of October.", "Nothing is booked today."]);
  });
});

describe("what the assistant is told", () => {
  it("carries the ask's checks and free times, and no money or old demo names", () => {
    const ctx = assistantContext(week(), NOW);
    expect(ctx.person.name).toBe("Sam");
    expect(ctx.today).toBe("Thursday 22 October");
    expect(ctx.pending_asks[0]).toMatchObject({ from: "Alex", when: "tonight", alternative_times: ["Fri 4–9 pm", "Sat 5–10 pm", "Thu 29 Oct 4–9 pm"] });
    expect(ctx.pending_asks[0].checks.week.state).toBe("bad");
    expect(JSON.stringify(ctx)).not.toMatch(/\$|rent|Dinda|Jess|Pandora/);
    expect(assistantContext(emptyData(AT), NOW).person.name).toBeNull();
  });
});

describe("speech text", () => {
  it("reads ranges and sources aloud cleanly", () => {
    expect(forSpeech("Dinner, 7:30–9:30 pm (Calendar) · Offshift")).toBe("Dinner, 7:30 to 9:30 pm, Offshift");
  });
});
