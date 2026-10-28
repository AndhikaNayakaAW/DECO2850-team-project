import { describe, expect, it } from "vitest";
import { FIELD_TEST_DAYS, fieldTestData, fieldTestMoments } from "../field-test";
import { shiftBodyLines } from "../shift-body";
import { weekdayName } from "../time";
import { cleanData } from "../validate";

describe("the field test days (F1)", () => {
  const data = fieldTestData();
  const highs = (date: string) => data.shifts.find((s) => s.date === date)!.body!.stress.filter((l) => l === 3).length;

  it("is a well-formed week the calendar can show", () => {
    expect(cleanData(data)).not.toBeNull();
  });

  it("runs six days, Friday 23 to Wednesday 28 October", () => {
    expect(FIELD_TEST_DAYS).toEqual(["2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28"]);
    expect(weekdayName(FIELD_TEST_DAYS[0])).toBe("Friday");
    expect(weekdayName(FIELD_TEST_DAYS.at(-1)!)).toBe("Wednesday");
  });

  it("keeps the participant and the employer anonymous", () => {
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/mcdonald/i);
    expect(new Set(data.shifts.map((s) => s.workplace))).toEqual(new Set(["Burger bar"]));
    expect(data.settings.name).toBe("");
  });

  it("holds his Friday, Sunday and Tuesday afternoon shifts, each rated and with its readings", () => {
    expect(data.shifts.map((s) => [s.date, s.start, s.effort])).toEqual([
      ["2026-10-23", "17:00", "steady"],
      ["2026-10-25", "11:00", "busy"],
      ["2026-10-27", "13:00", "hard"],
    ]);
    expect(data.shifts.every((s) => FIELD_TEST_DAYS.includes(s.date) && s.body)).toBe(true);
  });

  it("has classes on Friday, Monday and Wednesday, and the demo on Tuesday morning", () => {
    const classDays = [...new Set(data.uni.filter((u) => u.type === "class").map((u) => weekdayName(u.date)))];
    expect(classDays).toEqual(["Friday", "Monday", "Wednesday"]);
    const demo = data.uni.find((u) => u.type === "due")!;
    expect([weekdayName(demo.date), demo.start < "12:00"]).toEqual(["Tuesday", true]);
  });

  it("peaks on Tuesday after the demo, with Sunday's rush next and Friday calmest", () => {
    expect(highs("2026-10-27")).toBeGreaterThan(highs("2026-10-25"));
    expect(highs("2026-10-25")).toBeGreaterThan(highs("2026-10-23"));
  });

  it("keeps both asks declined", () => {
    expect(data.offers.map((o) => [o.date, o.status])).toEqual([
      ["2026-10-26", "declined"],
      ["2026-10-28", "declined"],
    ]);
  });
});

describe("what his watch showed those six days", () => {
  const moments = fieldTestMoments();
  const screen = (kind: string) => moments.filter((m) => m.screen.kind === kind).map((m) => m.screen);

  it("runs in time order from Friday to Tuesday", () => {
    const keys = moments.map((m) => `${m.date} ${m.time}`);
    expect(keys).toEqual([...keys].sort());
    expect(moments[0].date).toBe("2026-10-23");
    expect(moments.at(-1)!.date).toBe("2026-10-27");
  });

  it("asks how the work was after each shift, with the answer he gave", () => {
    expect(screen("check-in")).toEqual([
      { kind: "check-in", title: "Burger bar, 5-10 pm", chosen: "steady" },
      { kind: "check-in", title: "Burger bar, 11 am - 5 pm", chosen: "busy" },
      { kind: "check-in", title: "Burger bar, 1-6 pm", chosen: "hard" },
    ]);
  });

  it("shows each ask as the watch words it", () => {
    expect(screen("ask")).toEqual([
      { kind: "ask", from: "Sam - Burger bar", question: "Cover Monday?", time: "5-10 pm", quiet: null },
      { kind: "ask", from: "Sam - Burger bar", question: "Cover Wednesday?", time: "5-10 pm", quiet: null },
    ]);
  });

  it("shows only the past shifts he had worked when each ask came in", () => {
    const around = screen("around") as { lines: string[] }[];
    expect(around[0].lines[0]).toBe("Last at Burger bar: Steady");
    expect(around[0].lines).toContain("7pm clash: Demo prep");
    expect(around[1].lines[0]).toBe("Last 2 at Burger bar: Busy, Steady");
  });

  it("records his answers, and nothing goes to his manager", () => {
    expect(screen("answer")).toEqual([
      { kind: "answer", to: "Sam", chosen: "decline" },
      { kind: "answer", to: "Sam", chosen: "decline" },
    ]);
  });

  it("reads Tuesday's shift back in words, not numbers", () => {
    const last = screen("last-shift")[0] as { title: string; lines: string[] };
    const tuesday = fieldTestData().shifts.find((s) => s.date === "2026-10-27")!;
    expect(last.title).toBe("Burger bar, 1-6 pm");
    expect(last.lines).toEqual(shiftBodyLines(tuesday));
    expect(last.lines.join(" ")).not.toMatch(/\d+ ?bpm|\bscore\b/i);
  });
});
