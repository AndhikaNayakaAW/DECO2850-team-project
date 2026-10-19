import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isDateKey, isClock, longDate, nowIn, shortDate, weekDates, weekLabel, weekStart, weekdayOf, whenWord } from "@/lib/time";

describe("real dates in the worker's time zone", () => {
  it("reads now in Brisbane, not in the server's own zone", () => {
    const now = nowIn("Australia/Brisbane", new Date("2026-10-19T14:30:00Z"));
    expect(now).toMatchObject({ date: "2026-10-20", time: "00:30" });
    expect(nowIn("Australia/Brisbane", new Date("2026-10-19T02:05:00Z"))).toMatchObject({ date: "2026-10-19", time: "12:05" });
  });
  it("adds days across months and years", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-10-19", "2026-10-25")).toBe(6);
  });
  it("knows the weekday and the Monday that starts the week", () => {
    expect(weekdayOf("2026-10-19")).toBe("Mon");
    expect(weekdayOf("2026-10-25")).toBe("Sun");
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
    expect(weekStart("2026-10-19")).toBe("2026-10-19");
    expect(weekDates("2026-10-22")).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
  });
  it("writes dates the way people say them", () => {
    expect(longDate("2026-10-19")).toBe("Monday 19 October");
    expect(shortDate("2026-10-19")).toBe("Mon 19 Oct");
    expect(weekLabel("2026-10-19")).toBe("19–25 Oct");
    expect(weekLabel("2026-09-28")).toBe("28 Sep – 4 Oct");
  });
  it("says tonight, today, tomorrow, a weekday, or the date further out", () => {
    const now = { date: "2026-10-19", time: "13:00" };
    expect(whenWord("2026-10-19", "16:00", now)).toBe("tonight");
    expect(whenWord("2026-10-19", "09:00", now)).toBe("today");
    expect(whenWord("2026-10-20", "09:00", now)).toBe("tomorrow");
    expect(whenWord("2026-10-23", "09:00", now)).toBe("Friday");
    expect(whenWord("2026-10-28", "09:00", now)).toBe("Wed 28 Oct");
    expect(whenWord("2026-10-12", "09:00", now)).toBe("Mon 12 Oct");
  });
  it("checks what people type", () => {
    expect(isDateKey("2026-10-19")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("19/10/2026")).toBe(false);
    expect(isClock("09:30")).toBe(true);
    expect(isClock("24:00")).toBe(false);
    expect(isClock("9:30")).toBe(false);
  });
});

describe("a date field that was emptied", () => {
  it("never throws while a form is half filled in", () => {
    expect(() => whenWord("", "16:00", { date: "2026-10-19" })).not.toThrow();
    expect(shortDate("")).toBe("");
    expect(longDate("not a date")).toBe("not a date");
  });
});
