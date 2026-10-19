import { describe, expect, it } from "vitest";
import { addMinutesToClock, clock12, fromMinutes, hoursBetween, minutes, orderByPriority, overlap, range12, shiftImpact } from "@/lib/logic";

// Thursday 22 to Monday 26 October 2026
const THU = "2026-10-22";
const offer = { date: THU, start: "16:00", end: "21:00", travel: 35 };
const events = [
  { date: THU, start: "13:00", end: "15:00", title: "Tutorial" },
  { date: THU, start: "20:00", end: "22:00", title: "Dinner" },
  { date: "2026-10-23", start: "10:00", end: "16:00", title: "Shift" },
];

describe("time helpers", () => {
  it("converts clock strings to minutes and back", () => {
    expect(minutes("16:00")).toBe(960);
    expect(minutes("0:5")).toBe(5);
    expect(fromMinutes(960)).toBe("16:00");
    expect(fromMinutes(1440)).toBe("00:00");
  });
  it("detects overlapping ranges", () => {
    expect(overlap("16:00", "21:00", "20:00", "22:00")).toBe(true);
    expect(overlap("16:00", "21:00", "21:00", "22:00")).toBe(false);
  });
  it("speaks times the Australian way", () => {
    expect(clock12("16:00")).toBe("4 pm");
    expect(clock12("15:35")).toBe("3:35 pm");
    expect(range12("16:00", "21:00")).toBe("4–9 pm");
    expect(range12("09:00", "13:00")).toBe("9 am–1 pm");
  });
  it("adds minutes to a clock", () => {
    expect(addMinutesToClock("13:02", 30)).toBe("13:32");
  });
});

describe("shift maths", () => {
  it("finds conflicts, the gap before after travel, and the rest window", () => {
    const x = shiftImpact(offer, events);
    expect(x.conflicts.map((c) => c.title)).toEqual(["Dinner"]);
    expect(x.previous?.title).toBe("Tutorial");
    expect(x.gapBefore).toBe(25);
    expect(x.restAfter).toBe(780);
  });
  it("orders items by the worker's priorities", () => {
    expect(orderByPriority(["travel", "study", "income"], ["income", "study", "travel"])).toEqual(["income", "study", "travel"]);
  });
});

describe("overnight shifts", () => {
  const night = { date: THU, start: "22:00", end: "02:00", travel: 25 };

  it("counts hours across midnight", () => {
    expect(hoursBetween(night.start, night.end)).toBe(4);
  });

  it("detects clock overlaps on both sides of midnight", () => {
    expect(overlap("22:00", "02:00", "23:00", "23:30")).toBe(true);
    expect(overlap("22:00", "02:00", "01:00", "03:00")).toBe(true);
    expect(overlap("01:00", "03:00", "22:00", "02:00")).toBe(true);
    expect(overlap("22:00", "02:00", "02:00", "03:00")).toBe(false);
    expect(overlap("22:00", "02:00", "12:00", "13:00")).toBe(false);
    expect(overlap("22:00", "22:00", "21:00", "23:00")).toBe(false);
  });

  it("finds next-day conflicts and measures rest from the actual finish", () => {
    const commitments = [
      { date: THU, start: "18:00", end: "21:00", title: "Study" },
      { date: "2026-10-23", start: "01:00", end: "01:30", title: "Call home" },
      { date: "2026-10-23", start: "08:00", end: "09:00", title: "Tutorial" },
      { date: "2026-10-24", start: "01:00", end: "01:30", title: "Different day" },
    ];
    const result = shiftImpact(night, commitments);
    expect(result.conflicts.map((event) => event.title)).toEqual(["Call home"]);
    expect(result.previous?.title).toBe("Study");
    expect(result.gapBefore).toBe(35);
    expect(result.next?.title).toBe("Tutorial");
    expect(result.restAfter).toBe(360);
  });

  it("finds a conflict with an event that started the previous night", () => {
    const previousNight = { date: "2026-10-21", start: "23:00", end: "02:00", title: "Late plan" };
    expect(shiftImpact({ date: THU, start: "01:00", end: "03:00" }, [previousNight]).conflicts).toEqual([previousNight]);
  });

  it("follows a Sunday shift into Monday of the next week", () => {
    const commitments = [
      { date: "2026-10-26", start: "01:00", end: "01:30", title: "Call" },
      { date: "2026-10-26", start: "09:00", end: "10:00", title: "Class" },
    ];
    const result = shiftImpact({ ...night, date: "2026-10-25" }, commitments);
    expect(result.conflicts.map((event) => event.title)).toEqual(["Call"]);
    expect(result.next?.title).toBe("Class");
    expect(result.restAfter).toBe(420);
  });
});

describe("times around midnight", () => {
  it("reads 24:00 as midnight", () => {
    expect(range12("22:00", "24:00")).toBe("10 pm–12 am");
    expect(range12("22:00", "02:00")).toBe("10 pm–2 am");
    expect(range12("16:00", "21:00")).toBe("4–9 pm");
  });
});
