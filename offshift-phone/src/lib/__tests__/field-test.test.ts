import { describe, expect, it } from "vitest";
import { FIELD_TEST_WEEK, fieldTestData, fieldTestMoments } from "../field-test";
import { shiftBodyLines } from "../shift-body";
import { weekDates } from "../time";
import { cleanData } from "../validate";

describe("the field test week (F1)", () => {
  const data = fieldTestData();

  it("is a well-formed week the calendar can show", () => {
    expect(cleanData(data)).not.toBeNull();
  });

  it("keeps the participant and the employer anonymous", () => {
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/mcdonald/i);
    expect(new Set(data.shifts.map((s) => s.workplace))).toEqual(new Set(["Burger bar"]));
    expect(data.settings.name).toBe("");
  });

  it("holds his three shifts, rated as he rated them, each with its readings", () => {
    const week = weekDates(FIELD_TEST_WEEK);
    expect(data.shifts.map((s) => [s.date, s.effort])).toEqual([
      ["2026-10-19", "hard"],
      ["2026-10-21", "busy"],
      ["2026-10-25", "steady"],
    ]);
    expect(data.shifts.every((s) => week.includes(s.date) && s.body)).toBe(true);
  });

  it("keeps both asks declined, as he answered them", () => {
    expect(data.offers.map((o) => [o.date, o.status])).toEqual([
      ["2026-10-22", "declined"],
      ["2026-10-24", "declined"],
    ]);
  });
});

describe("what his watch showed that week", () => {
  const moments = fieldTestMoments();
  const screen = (kind: string) => moments.filter((m) => m.screen.kind === kind).map((m) => m.screen);

  it("runs in time order through the week", () => {
    const keys = moments.map((m) => `${m.date} ${m.time}`);
    expect(keys).toEqual([...keys].sort());
    expect(moments[0].date).toBe("2026-10-19");
    expect(moments.at(-1)!.date).toBe("2026-10-25");
  });

  it("asks how the work was after each shift, with the answer he gave", () => {
    expect(screen("check-in")).toEqual([
      { kind: "check-in", title: "Burger bar, 4-10 pm", chosen: "hard" },
      { kind: "check-in", title: "Burger bar, 5-10 pm", chosen: "busy" },
      { kind: "check-in", title: "Burger bar, 10 am - 3 pm", chosen: "steady" },
    ]);
  });

  it("shows each ask as the watch words it", () => {
    expect(screen("ask")).toEqual([
      { kind: "ask", from: "Sam - Burger bar", question: "Cover Thursday?", time: "5-10 pm", quiet: null },
      { kind: "ask", from: "Sam - Burger bar", question: "Cover tonight?", time: "5-10 pm", quiet: null },
    ]);
  });

  it("shows only the past shifts he had worked when each ask came in", () => {
    const around = screen("around") as { lines: string[] }[];
    expect(around[0].lines[0]).toBe("Last at Burger bar: Hard");
    expect(around[0].lines).toContain("6pm clash: Demo prep");
    expect(around[1].lines[0]).toBe("Last 2 at Burger bar: Busy, Hard");
  });

  it("records his answers, and nothing goes to his manager", () => {
    expect(screen("answer")).toEqual([
      { kind: "answer", to: "Sam", chosen: "decline" },
      { kind: "answer", to: "Sam", chosen: "decline" },
    ]);
  });

  it("ends with Sunday's shift read back in words, not numbers", () => {
    const last = screen("last-shift")[0] as { title: string; lines: string[] };
    const sunday = fieldTestData().shifts.find((s) => s.date === "2026-10-25")!;
    expect(last.title).toBe("Burger bar, 10 am - 3 pm");
    expect(last.lines).toEqual(shiftBodyLines(sunday));
    expect(last.lines.join(" ")).not.toMatch(/\d+ ?bpm|\bscore\b/i);
  });
});
