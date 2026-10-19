import { describe, expect, it } from "vitest";
import { altSlots, bodyCheck, bodyTile, buildWeek, clashes, dayItems, draftFor, isLateFinish, offerChecks, replyDraft, weekCheck, workplacesOf } from "@/lib/checks";
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

describe("alternatives and replies", () => {
  it("offers free windows in the next days, then the same time next week", () => {
    expect(altSlots(ask(), week(), NOW).map((a) => a.label)).toEqual(["Fri 4–9 pm", "Sat 5–10 pm", "Thu 29 Oct 4–9 pm"]);
  });
  it("declines honestly without naming the worker's plans, and wishes Mia well", () => {
    const d = replyDraft(ask(), "decline", week(), NOW);
    expect(d.warm).toBe("Hi Alex, thanks for thinking of me. I can't do tonight. I've got plans I can't move. Hope Mia feels better soon.");
    expect(draftFor(d, "plain")).toBe("Hi Alex, I can't do tonight, sorry. I've got plans I can't move. Hope Mia's okay.");
  });
  it("accepting mentions class finishing first, by its kind only", () => {
    expect(replyDraft(ask(), "accept", week(), NOW).warm).toBe("Hi Alex, yes, I can do tonight. My class finishes at 3 pm, so I'll be there for 4 pm.");
  });
  it("another time names the slot, a swap names someone only if the worker does", () => {
    expect(replyDraft(ask(), "negotiate", week(), NOW).warm).toContain("I could do Friday 4–9 pm if that helps.");
    expect(replyDraft(ask(), "swap", week(), NOW).warm).toBe("Hi Alex, I can't do tonight. I'm happy to ask around the team to see if someone can swap. Hope Mia feels better soon.");
    expect(replyDraft(ask(), "swap", week(), NOW, { colleague: "Priya" }).plain).toBe("Hi Alex, can't do tonight. Priya can take it if that's okay.");
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

describe("what a drafted reply may say", () => {
  const plan = (title: string) => ({ ...week(), personal: [{ id: "p-x", date: "2026-10-22", start: "17:00", end: "18:00", title, category: "appointment" as const, importance: "protected" as const }] });
  it("never names a plan, and never gives a reason from the body", () => {
    const watch = { ...plan("Psychologist appointment"), wearable: { level: 0 as const, word: "Very low", at: "12:00", source: "Garmin", signals: { energy: 0 as const, sleep: 0 as const } } };
    for (const decision of ["decline", "accept", "negotiate", "swap"] as const) {
      const d = replyDraft(ask(), decision, watch, NOW);
      expect(`${d.warm} ${d.plain}`).not.toMatch(/psychologist|appointment|rest|tired|long days|sleep|watch|dinner/i);
    }
  });
  it("never calls a rest day a day off when the worker is rostered on it", () => {
    const rostered = { ...week(), shifts: [...week().shifts, { id: "s-sun", date: "2026-10-25", start: "08:00", end: "12:00", workplace: "Café" }] };
    const sunday = ask({ date: "2026-10-25", start: "14:00", end: "18:00" });
    expect(replyDraft(sunday, "decline", rostered, NOW).warm).not.toMatch(/day off/);
    expect(replyDraft(sunday, "decline", week(), NOW).warm).toContain("Sunday's my day off.");
    expect(bodyCheck(sunday, rostered, NOW).text).not.toMatch(/nothing else lands on it/);
  });
  it("gives a reason by its kind only", () => {
    const working = { ...week(), personal: [], shifts: [...week().shifts, { id: "s-x", date: "2026-10-22", start: "15:00", end: "18:00", workplace: "Bar" }] };
    expect(replyDraft(ask(), "decline", working, NOW).warm).toContain("I'm already working then.");
    const studying = { ...week(), personal: [], uni: [{ id: "u-x", date: "2026-10-22", start: "17:00", end: "19:00", title: "Lab", type: "class" as const }] };
    expect(replyDraft(ask(), "decline", studying, NOW).warm).toContain("I've got class then.");
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
  it("names a time a week or more away by its date, and never offers one that has passed", () => {
    const mon = { date: "2026-10-19", time: "10:00" };
    const saturdayNight = ask({ date: "2026-10-24", start: "22:00", end: "06:00" });
    expect(altSlots(saturdayNight, week(), mon).some((a) => a.date === "2026-10-31")).toBe(false);
    const old = ask({ date: "2026-10-01", start: "16:00", end: "21:00" });
    expect(altSlots(old, week(), NOW).every((a) => a.date >= NOW.date)).toBe(true);
    const labels = altSlots(ask({ date: "2026-10-24", start: "10:00", end: "14:00" }), { ...week(), settings: { ...week().settings, restDays: [] } }, mon).map((a) => a.label);
    expect(labels.some((l) => l.startsWith("Mon 26 Oct"))).toBe(true);
  });
  it("lets a reading from the watch go quiet after twelve hours", () => {
    const at = "2026-10-21T20:00:00.000Z"; // Thursday 6 am in Brisbane
    const data = { ...week(), wearable: { level: 1 as const, word: "Running low", at: "06:00", source: "Garmin", receivedAt: at } };
    expect(bodyTile(data, { date: "2026-10-22", time: "13:02" }).label).toBe("Running low");
    expect(bodyTile(data, { date: "2026-10-22", time: "19:00" }).label).not.toBe("Running low");
  });
});
