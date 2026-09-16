import { describe, expect, it } from "vitest";
import { altSlots, bodyCheck, buildDays, dayListWithTravel, moneyCheck, moneySummary, offerChecks, replyDraft, weekCheck, type DataState } from "@/lib/checks";
import { initialOffers, initialPersonal, initialSettings, initialShifts, initialUni } from "@/lib/scenario";
import type { Offer } from "@/lib/types";

function seed(): DataState {
  return { shifts: structuredClone(initialShifts), uni: structuredClone(initialUni), personal: structuredClone(initialPersonal), offers: structuredClone(initialOffers), settings: structuredClone(initialSettings) };
}
const jess = (): Offer => seed().offers[0];

describe("the three checks on Jess's ask", () => {
  it("Body remembers Tuesday's close and counts the second close in three days", () => {
    const c = bodyCheck(jess(), seed());
    expect(c.state).toBe("warn");
    expect(c.text).toContain("Tuesday's close is still in your legs");
    expect(c.text).toContain("second close in three days");
  });
  it("Week flags the dinner overlap and the bus from the tute", () => {
    const c = weekCheck(jess(), seed());
    expect(c.state).toBe("bad");
    expect(c.text).toContain("Overlaps dinner with Ayu");
    expect(c.text).toContain("35 minutes");
  });
  it("Money says essentials are covered by Saturday and what tonight adds", () => {
    const c = moneyCheck(jess(), seed());
    expect(c.state).toBe("ok");
    expect(c.text).toContain("covered by Saturday");
    expect(c.text).toContain("$160");
  });
  it("orders the checks by the month's priority", () => {
    const s = seed();
    expect(offerChecks(jess(), s).map((c) => c.key)).toEqual(["body", "week", "money"]);
    s.settings.priority = "money";
    expect(offerChecks(jess(), s).map((c) => c.key)[0]).toBe("money");
  });
  it("treats an ask on the protected day as a boundary, not a schedule gap", () => {
    const sunday: Offer = { ...jess(), id: "o-sun", employer: "mcd", day: "Sun", start: "10:00", end: "16:00", from: "Raj", note: "Short on Sunday." };
    expect(bodyCheck(sunday, seed()).state).toBe("bad");
    expect(weekCheck(sunday, seed()).text).toContain("because you booked rest");
  });
  it("names an eleven-hour day when a close follows a shift at the same shop", () => {
    const fri: Offer = { ...jess(), id: "o-fri", day: "Fri", start: "16:00", end: "21:00", note: "Stay on?" };
    expect(bodyCheck(fri, seed()).text).toContain("11 hours");
    expect(weekCheck(fri, seed()).text).toContain("Runs straight on");
  });
});

describe("money and alternatives", () => {
  it("covers essentials on Saturday with money to spare", () => {
    const m = moneySummary(seed());
    expect(m.coveredBy).toBe("Sat");
    expect(m.past).toBe(276);
  });
  it("offers Friday morning before the 10 am shift first", () => {
    expect(altSlots(jess(), seed())[0].label).toBe("Fri 8–10 am");
  });
});

describe("reply drafts", () => {
  it("declines honestly and wishes Mia well", () => {
    const d = replyDraft(jess(), "decline", seed());
    expect(d.warm).toContain("I can't do tonight");
    expect(d.warm).toContain("Hope Mia feels better soon");
    expect(d.plain).not.toContain("thinking of me");
  });
  it("accepting mentions arriving after the tute", () => {
    expect(replyDraft(jess(), "accept", seed()).warm).toContain("there about 3:35 pm");
  });
});

describe("the week view", () => {
  it("builds seven days with today marked and Sunday protected", () => {
    const days = buildDays(seed());
    expect(days).toHaveLength(7);
    expect(days.find((d) => d.today)?.day).toBe("Thu");
    expect(days[6].rest).toBe(true);
  });
  it("writes travel around a shift but not between back-to-back shifts", () => {
    const s = seed();
    const thu = buildDays(s).find((d) => d.day === "Thu")!;
    expect(dayListWithTravel(thu, s).some((it) => it.label.startsWith("Travel · 35"))).toBe(false);
    const mon = buildDays(s).find((d) => d.day === "Mon")!;
    const list = dayListWithTravel(mon, s);
    expect(list.filter((it) => it.travelFor)).toHaveLength(2);
  });
});
