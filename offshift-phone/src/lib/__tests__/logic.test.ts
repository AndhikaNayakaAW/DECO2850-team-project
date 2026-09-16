import { describe, expect, it } from "vitest";
import { addMinutesToClock, clock12, fromMinutes, income, minutes, orderByPriority, overlap, paidMinutes, range12, shiftImpact } from "@/lib/logic";

const offer = { day: "Thu" as const, start: "16:00", end: "21:00", break: 30, travel: 35 };
const events = [
  { day: "Thu" as const, start: "13:00", end: "15:00", title: "Tutorial" },
  { day: "Thu" as const, start: "20:00", end: "22:00", title: "Dinner" },
  { day: "Fri" as const, start: "10:00", end: "16:00", title: "Shift" },
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
  it("advances the scenario clock", () => {
    expect(addMinutesToClock("13:02", 30)).toBe("13:32");
  });
});

describe("shift maths", () => {
  it("pays for time minus the unpaid break", () => {
    expect(paidMinutes(offer)).toBe(270);
    expect(income(offer, 32)).toBe(144);
  });
  it("finds conflicts, the travel buffer and the rest window", () => {
    const x = shiftImpact(offer, events);
    expect(x.conflicts.map((c) => c.title)).toEqual(["Dinner"]);
    expect(x.previous?.title).toBe("Tutorial");
    expect(x.travelBuffer).toBe(25);
    expect(x.restMinutes).toBe(780);
  });
  it("orders items by the worker's priorities", () => {
    expect(orderByPriority(["travel", "study", "income"], ["income", "study", "travel"])).toEqual(["income", "study", "travel"]);
  });
});
