import { describe, expect, it } from "vitest";
import { applyResponse, askProblem, sendAsk } from "@/lib/actions";
import { emptyData, exampleWeek, isCurrent } from "@/lib/session";
import { AT, week } from "./fixture";

describe("answering an ask, as pure data", () => {
  it("accepting books the shift at that workplace and logs it, with no message", () => {
    const r = applyResponse(week(), "o-thu", "accept", AT)!;
    expect(r.data.offers[0].status).toBe("accepted");
    expect(r.data.shifts.at(-1)).toMatchObject({ date: "2026-10-22", start: "16:00", end: "21:00", workplace: "Café", viaOffer: "o-thu" });
    expect(r.data.sync.at(-1)).toMatchObject({ to: "Alex", offerId: "o-thu", text: "Took Thu 22 Oct 4–9 pm at Café. Added to the week." });
    expect(r.toast).toBe("Added to your week.");
  });
  it("declining books nothing", () => {
    const r = applyResponse(week(), "o-thu", "decline", AT)!;
    expect(r.data.offers[0].status).toBe("declined");
    expect(r.data.shifts).toHaveLength(week().shifts.length);
    expect(r.toast).toBe("Declined. Thursday stays as it is.");
  });
  it("deciding later is logged for the worker only", () => {
    const r = applyResponse(week(), "o-thu", "later", AT)!;
    expect(r.data.offers[0].status).toBe("deferred");
    expect(r.data.sync.at(-1)).toMatchObject({ to: "Only you" });
  });
  it("leaves its input untouched and ignores unknown or answered asks", () => {
    const data = week();
    const before = structuredClone(data);
    const r = applyResponse(data, "o-thu", "accept", AT)!;
    expect(data).toEqual(before);
    expect(applyResponse(data, "nope", "accept", AT)).toBeNull();
    expect(applyResponse(r.data, "o-thu", "decline", AT)).toBeNull();
  });
});

describe("the team's side", () => {
  it("sends an ask with a friendly default message", () => {
    const r = sendAsk(week(), { from: " Alex ", workplace: "Café", date: "2026-10-24", start: "17:00", end: "22:00" }, AT);
    const o = r.data.offers.find((x) => x.id === r.id)!;
    expect(o).toMatchObject({ from: "Alex", status: "pending", note: "Hi Sam, any chance you could cover Saturday, 5–10 pm?" });
    expect(r.data.messages.at(-1)).toMatchObject({ from: "team", offerId: r.id });
  });
  it("checks an ask before it goes", () => {
    expect(askProblem({ from: "", workplace: "Café", date: "2026-10-24", start: "17:00", end: "22:00" })).toBe("Who is asking?");
    expect(askProblem({ from: "Alex", workplace: " ", date: "2026-10-24", start: "17:00", end: "22:00" })).toBe("Which workplace is it for?");
    expect(askProblem({ from: "Alex", workplace: "Café", date: "24/10", start: "17:00", end: "22:00" })).toBe("Pick a date.");
    expect(askProblem({ from: "Alex", workplace: "Café", date: "2026-10-24", start: "17:00", end: "17:00" })).toBe("The shift needs a length.");
    expect(askProblem({ from: "Alex", workplace: "Café", date: "2026-10-24", start: "22:00", end: "02:00" })).toBeNull();
    const now = { date: "2026-10-22", time: "21:15" };
    expect(askProblem({ from: "Alex", workplace: "Café", date: "2026-10-22", start: "16:00", end: "18:00" }, now)).toBe("That time has passed.");
    expect(askProblem({ from: "Alex", workplace: "Café", date: "2026-10-21", start: "16:00", end: "18:00" }, now)).toBe("That date has passed.");
    expect(askProblem({ from: "Alex", workplace: "Café", date: "2026-10-22", start: "22:00", end: "02:00" }, now)).toBeNull();
  });
});

describe("sessions", () => {
  it("start empty, with no name and nothing from the last participant", () => {
    const d = emptyData(AT);
    expect([d.shifts, d.uni, d.personal, d.offers, d.messages, d.sync].every((xs) => xs.length === 0)).toBe(true);
    expect(d.settings.name).toBe("");
    expect(d.wearable).toBeNull();
  });
  it("never read an older saved week as a current one", () => {
    expect(isCurrent(emptyData(AT))).toBe(true);
    expect(isCurrent({ clock: "13:02", shifts: [{ id: "s1", employer: "pandora", day: "Thu" }] })).toBe(false);
    expect(isCurrent(null)).toBe(false);
  });
  it("load a practice week in the current week, with generic places and nobody's name", () => {
    const d = exampleWeek(AT);
    expect(d.shifts.every((s) => s.date >= "2026-10-19" && s.date <= "2026-10-25")).toBe(true);
    expect(JSON.stringify(d)).not.toMatch(/Dinda|Jess|Pandora|McDonald|Raj/);
    expect(d.offers).toHaveLength(0);
  });
});
