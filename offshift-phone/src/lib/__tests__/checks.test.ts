import { describe, expect, it } from "vitest";
import { bodyCheck, bodyTile, buildWeek, clashes, dayItems, isLateFinish, offerChecks, weekCheck, workplacesOf } from "@/lib/checks";
import { NOW, ask, week } from "./fixture";

describe("the checks on an ask", () => {
  it("Body remembers Tuesday's late finish and counts the second in three days", () => {
    const c = bodyCheck(ask(), week(), NOW);
    expect(c.state).toBe("warn");
    expect(c.text).toBe("Tuesday's late finish is still in your legs. You rated it Tired. Tonight would be your second late finish in three days, and Friday starts at 10 am.");
  });
  it("Week flags the overlap, the gap after the tutorial and what's due", () => {
    const c = weekCheck(ask(), week(), NOW);
    expect(c.state).toBe("bad");
    expect(c.text).toBe("Overlaps your dinner with a friend, 7:30–9:30 pm. Your tutorial ends at 3 pm, 60 minutes before this starts. Report is due tomorrow at 11:59 pm.");
  });
  it("never mentions money, travel guesses or a fixed employer", () => {
    const text = offerChecks(ask(), week(), NOW).map((c) => c.text).join(" ");
    expect(text).not.toMatch(/\$|bus|travel|Pandora|McDonald|Dinda|Jess/i);
  });
  it("treats an ask on a rest day as a boundary, not a gap", () => {
    const sunday = ask({ date: "2026-10-25", start: "10:00", end: "14:00" });
    expect(bodyCheck(sunday, week(), NOW)).toMatchObject({ state: "bad", text: "Sunday is a rest day you set aside, so nothing else lands on it. Giving it away is your call." });
    expect(weekCheck(sunday, week(), NOW).text).toBe("Nothing else is on Sunday: it's a rest day you set aside.");
  });
  it("names a long day when a shift follows another at the same place", () => {
    const longDay = ask({ date: "2026-10-23", start: "16:00", end: "21:00" });
    expect(weekCheck(longDay, week(), NOW).text).toContain("Runs straight on from your 10 am–4 pm shift: 11 hours in one go.");
    expect(bodyCheck(longDay, week(), NOW).text).toContain("that's 11 hours of work tomorrow");
  });
  it("notes when the rest before the next commitment is short", () => {
    const late = ask({ date: "2026-10-23", start: "18:00", end: "23:30", workplace: "Bar" });
    const data = { ...week(), shifts: week().shifts.filter((s) => s.id !== "s-tue" && s.id !== "s-fri") };
    expect(bodyCheck(late, data, NOW).text).toContain("Leaves 9.5 hours before your Supermarket shift on Saturday at 9 am.");
  });
  it("adds what the watch reads, in words, and takes the worse state", () => {
    const data = { ...week(), wearable: { level: 1 as const, word: "Running low", at: "12:55", source: "Garmin", signals: { energy: 1 as const, sleep: 1 as const } } };
    const c = bodyCheck(ask({ start: "09:00", end: "11:00", date: "2026-10-24" }), data, NOW);
    expect(c.text.startsWith("Your watch reads running low, with a poor night's sleep.")).toBe(true);
    expect(c.state).toBe("warn");
  });
});

describe("the week", () => {
  it("builds Monday to Sunday with real dates, today marked and the rest day kept", () => {
    const days = buildWeek(week(), "2026-10-22", NOW);
    expect(days.map((d) => d.date)).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
    expect(days.find((d) => d.today)?.day).toBe("Thu");
    expect(days[6]).toMatchObject({ day: "Sun", rest: true, items: [{ kind: "rest", label: "Rest day" }] });
  });
  it("labels shifts by workplace and late finishes, and shows the waiting ask", () => {
    const items = dayItems(week(), "2026-10-22");
    expect(items.map((i) => i.label)).toEqual(["Tutorial", "Ask from Alex · late finish", "Dinner with a friend"]);
    expect(dayItems(week(), "2026-10-20").map((i) => i.label)).toEqual(["Café · late finish", "Call home"]);
    expect(dayItems(week(), "2026-10-24")[0]).toMatchObject({ label: "Supermarket · 8h", workplaceIndex: 1 });
  });
  it("knows the worker's workplaces in the order they appear, and which plans a shift sits on", () => {
    expect(workplacesOf(week())).toEqual(["Café", "Supermarket"]);
    expect(clashes(week())).toEqual({ "p-tue": "Café 4–9 pm" });
  });
  it("counts a shift past midnight as a late finish", () => {
    expect(isLateFinish({ start: "18:00", end: "01:00" }, { lateFinish: "21:00" })).toBe(true);
    expect(isLateFinish({ start: "09:00", end: "17:00" }, { lateFinish: "21:00" })).toBe(false);
  });
  it("reads the body from ratings until a watch shares", () => {
    expect(bodyTile(week(), NOW)).toMatchObject({ state: "warn", label: "Getting tired" });
    expect(bodyTile(week(), NOW).detail).toBe("Tuesday's late finish rated Tired. Two early starts ahead this week.");
  });
});

describe("checks keep reading right", () => {
  it("flags a clash on a rest day", () => {
    const data = { ...week(), personal: [{ id: "p-sun", date: "2026-10-25", start: "12:00", end: "15:00", title: "Lunch", category: "personal" as const, importance: "flexible" as const }] };
    expect(weekCheck(ask({ date: "2026-10-25", start: "11:00", end: "16:00" }), data, NOW)).toMatchObject({ state: "bad", text: "Overlaps your lunch, 12–3 pm." });
  });
  it("doesn't call an ask a clash with the shift it booked", () => {
    const taken = { ...week(), offers: [ask({ status: "accepted" })], shifts: [...week().shifts, { id: "s-o", date: "2026-10-22", start: "16:00", end: "21:00", workplace: "Café", viaOffer: "o-thu" }] };
    expect(weekCheck(taken.offers[0], taken, NOW).text).not.toMatch(/Café shift/);
  });
  it("uses capitals, plurals and hours where a person would", () => {
    const fri = ask({ date: "2026-10-23", start: "18:00", end: "21:00" });
    const quiet = { ...week(), shifts: [], uni: [], personal: [] };
    expect(weekCheck(fri, quiet, NOW).text).toBe("Nothing else tomorrow before it.");
    expect(weekCheck(ask({ date: "2026-10-29", start: "18:00", end: "21:00" }), quiet, NOW).text).toBe("Nothing else on Thu 29 Oct before it.");
    const early = { ...quiet, uni: [{ id: "u-7", date: "2026-10-23", start: "07:00", end: "09:00", title: "Lecture", type: "class" as const }] };
    expect(bodyCheck(ask({ date: "2026-10-22", start: "22:00", end: "06:00" }), early, NOW).text).toBe("Leaves 1 hour before your lecture tomorrow at 7 am.");
    const long = { ...quiet, uni: [{ id: "u-1", date: "2026-10-24", start: "09:00", end: "12:00", title: "Lab", type: "class" as const }] };
    expect(weekCheck(ask({ date: "2026-10-24", start: "15:00", end: "19:00" }), long, NOW).text).toBe("Your lab ends at 12 pm, 3 hours before this starts.");
  });
  it("counts a late-finish time after midnight as the next morning", () => {
    expect(isLateFinish({ start: "09:00", end: "13:00" }, { lateFinish: "00:30" })).toBe(false);
    expect(isLateFinish({ start: "18:00", end: "01:00" }, { lateFinish: "00:30" })).toBe(true);
    expect(isLateFinish({ start: "16:00", end: "00:00" }, { lateFinish: "21:00" })).toBe(true);
  });
  it("lets a reading from the watch go quiet after twelve hours", () => {
    const at = "2026-10-21T20:00:00.000Z"; // Thursday 6 am in Brisbane
    const data = { ...week(), wearable: { level: 1 as const, word: "Running low", at: "06:00", source: "Garmin", receivedAt: at } };
    expect(bodyTile(data, { date: "2026-10-22", time: "13:02" }).label).toBe("Running low");
    expect(bodyTile(data, { date: "2026-10-22", time: "19:00" }).label).not.toBe("Running low");
  });
});
