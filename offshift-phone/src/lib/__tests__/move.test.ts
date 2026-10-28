import { describe, expect, it } from "vitest";
import { canDrag, slotFacts } from "@/lib/move";
import type { DayItem, DayView, ItemKind } from "@/lib/types";

const item = (id: string, kind: ItemKind, start: string, end: string, label: string): DayItem => ({ id, kind, start, end, label, source: "Offshift" });
const view = (day: DayView["day"], date: string, items: DayItem[], rest = false): DayView => ({ day, date, dayNum: Number(date.slice(8)), today: false, rest, items });

const WEEK: DayView[] = [
  view("Wed", "2026-10-28", [item("gym", "personal", "18:00", "19:00", "Gym"), item("tut", "uni", "13:00", "15:00", "Tutorial")]),
  view("Thu", "2026-10-29", [item("prac", "uni", "15:00", "16:30", "Practical"), item("study", "personal", "19:00", "21:00", "Study for the assignment")]),
  view("Fri", "2026-10-30", [item("lec", "uni", "09:00", "11:00", "Lecture")]),
  view("Sun", "2026-11-01", [], true),
];

describe("dragging a block to a new day and time", () => {
  it("moves only the worker's own plans: shifts are rostered, classes come from the timetable, asks are the manager's", () => {
    expect(canDrag({ kind: "personal" })).toBe(true);
    for (const kind of ["shift", "uni", "offer", "due", "rest", "travel", "boundary"] as ItemKind[]) expect(canDrag({ kind })).toBe(false);
  });

  it("says, as plain facts, what the new slot would overlap or crowd", () => {
    expect(slotFacts("gym", { day: "Thu", start: "18:30", end: "19:30" }, WEEK)).toEqual(["Overlaps Study for the assignment, 7–9 pm."]);
    expect(slotFacts("gym", { day: "Thu", start: "16:45", end: "17:45" }, WEEK)).toEqual(["Only 15 minutes after Practical ends at 4:30 pm."]);
    expect(slotFacts("gym", { day: "Sun", start: "10:00", end: "11:00" }, WEEK)).toEqual(["Sits on Sunday, a rest day you keep clear."]);
    expect(slotFacts("gym", { day: "Thu", start: "21:30", end: "22:30" }, WEEK)).toEqual(["Runs into quiet hours after 10 pm."]);
  });

  it("notes a late finish that leaves little rest before the next day's first class", () => {
    expect(slotFacts("gym", { day: "Thu", start: "22:00", end: "23:30" }, WEEK)).toEqual(["Runs into quiet hours after 10 pm.", "Leaves 10 hours before Friday's 9 am start."]);
  });

  it("names nothing when the slot is clear, and never counts the plan against itself", () => {
    expect(slotFacts("gym", { day: "Wed", start: "18:30", end: "19:30" }, WEEK)).toEqual([]);
    expect(slotFacts("gym", { day: "Fri", start: "13:00", end: "14:00" }, WEEK)).toEqual([]);
  });
});
