import { describe, expect, it } from "vitest";
import { addMinutesToClock, clock12, fromMinutes, hoursBetween, income, minutes, orderByPriority, overlap, paidMinutes, range12, shiftImpact } from "@/lib/logic";

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


describe("overnight shifts", () => {
  const night = { day: "Thu" as const, start: "22:00", end: "02:00", break: 30, travel: 25 };

  it("counts paid time and income across midnight", () => {
    expect(paidMinutes(night)).toBe(210);
    expect(income(night, 32)).toBe(112);
    expect(hoursBetween(night.start, night.end)).toBe(4);
  });

  it("keeps equal clock times empty and clamps an excessive break", () => {
    expect(paidMinutes({ start: "22:00", end: "22:00" })).toBe(0);
    expect(paidMinutes({ ...night, break: 300 })).toBe(0);
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
      { day: "Thu" as const, start: "18:00", end: "21:00", title: "Study" },
      { day: "Fri" as const, start: "01:00", end: "01:30", title: "Call home" },
      { day: "Fri" as const, start: "08:00", end: "09:00", title: "Tutorial" },
      { day: "Sat" as const, start: "01:00", end: "01:30", title: "Different day" },
    ];
    const result = shiftImpact(night, commitments);
    expect(result.conflicts.map((event) => event.title)).toEqual(["Call home"]);
    expect(result.previous?.title).toBe("Study");
    expect(result.travelBuffer).toBe(35);
    expect(result.next?.title).toBe("Tutorial");
    expect(result.restMinutes).toBe(360);
  });

  it("finds a conflict with an event that started the previous night", () => {
    const previousNight = { day: "Wed" as const, start: "23:00", end: "02:00", title: "Late plan" };
    expect(shiftImpact({ day: "Thu", start: "01:00", end: "03:00" }, [previousNight]).conflicts).toEqual([previousNight]);
  });

  it("includes Monday commitments when a Sunday shift crosses the week boundary", () => {
    const commitments = [
      { day: "Mon" as const, start: "01:00", end: "01:30", title: "Call" },
      { day: "Mon" as const, start: "09:00", end: "10:00", title: "Class" },
    ];
    const result = shiftImpact({ ...night, day: "Sun" }, commitments);
    expect(result.conflicts.map((event) => event.title)).toEqual(["Call"]);
    expect(result.next?.title).toBe("Class");
    expect(result.restMinutes).toBe(420);
  });
});
