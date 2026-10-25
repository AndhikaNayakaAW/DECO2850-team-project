import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { applyResponse } from "@/lib/actions";
import { applyTeamAction, teamView } from "@/lib/team";
import type { DataSlice } from "@/lib/types";
import { AT, week } from "./fixture";

process.env.OFFSHIFT_STATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "offshift-team-")), "state.json");
const team = await import("@/app/api/team/route");
const state = await import("@/app/api/state/route");
const g = globalThis as unknown as { __offshiftState?: { version: number; client: string | null; data: unknown } };

/** A week with everything the team must never see: readings from a shift, a private check-in and plans. */
function privateWeek(): DataSlice {
  const w = week();
  return {
    ...w,
    shifts: w.shifts.map((s) => (s.id === "s-mon" ? { ...s, body: { receivedAt: AT.toISOString(), stress: Array(20).fill(3), heart: Array(20).fill(2) } } : s)),
    sync: [...w.sync, { id: "y-private", at: AT.toISOString(), from: "Offshift", to: "Only you", text: "Check-in: not so good today." }],
    messages: [...w.messages, { id: "m-move", from: "worker", text: "Could I swap Friday's shift for Saturday?", at: AT.toISOString() }],
  };
}

describe("what the research team sees", () => {
  it("shows asks, answers and the worker's messages to the team, never plans, body readings or private notes", () => {
    const answered = applyResponse(privateWeek(), "o-thu", "decline", AT)!.data;
    const view = teamView(answered, 3, null);
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/stress|heart|body|Dinner with a friend|Call home|Tutorial|Check-in|Only you/i);
    expect(view.asks[0]).toMatchObject({ id: "o-thu", status: "declined" });
    expect(view.asks[0].thread.some((m) => m.from === "worker")).toBe(false);
    expect(view.notes.map((n) => n.text)).toEqual(["Could I swap Friday's shift for Saturday?"]);
    expect(view.workplaces).toEqual(["Café"]);
  });
  it("can't tell an ask the worker is deciding later from one they haven't seen", () => {
    const later = applyResponse(week(), "o-thu", "later", AT)!.data;
    expect(teamView(later, 1, null).asks[0].status).toBe("pending");
    expect(JSON.stringify(teamView(later, 1, null))).not.toMatch(/remind|deferred|later/i);
  });
});

describe("what the research team can do", () => {
  it("sends an ask, but not for a day that has passed", () => {
    const ask = { from: "Alex", workplace: "Café", date: "2026-10-24", start: "17:00", end: "22:00" };
    expect(applyTeamAction(week(), { action: "send-ask", ask: { ...ask, date: "2026-10-21" } }, AT)).toEqual({ problem: "That date has passed." });
    const r = applyTeamAction(week(), { action: "send-ask", ask }, AT) as { data: DataSlice };
    expect(r.data.offers.at(-1)).toMatchObject({ from: "Alex", date: "2026-10-24", status: "pending" });
  });

  it("names the worker, starts a new session and loads the practice week", () => {
    expect((applyTeamAction(week(), { action: "name", name: " Jo " }, AT) as { data: DataSlice }).data.settings.name).toBe("Jo");
    const fresh = (applyTeamAction(privateWeek(), { action: "new-session" }, AT) as { data: DataSlice }).data;
    expect([fresh.shifts, fresh.offers, fresh.messages, fresh.sync].every((x) => x.length === 0)).toBe(true);
    expect((applyTeamAction(week(), { action: "practice-week" }, AT) as { data: DataSlice }).data.shifts.length).toBeGreaterThan(0);
    expect(applyTeamAction(week(), { action: "delete-everything" }, AT)).toEqual({ problem: "Unknown action." });
  });
});

describe("/api/team", () => {
  beforeEach(() => {
    g.__offshiftState = { version: 2, client: null, data: privateWeek() };
  });

  it("never sends the team the worker's private data", async () => {
    const text = await (await team.GET(new Request("http://x/api/team"))).text();
    expect(text).not.toMatch(/stress|heart|Dinner with a friend|Check-in/i);
  });

  it("puts an ask on the worker's calendar", async () => {
    const res = await team.POST(new Request("http://x/api/team", { method: "POST", body: JSON.stringify({ action: "send-ask", ask: { from: "Sam", workplace: "Café", date: "2099-01-05", start: "09:00", end: "13:00" } }) }));
    expect(res.status).toBe(200);
    const shared = await (await state.GET(new Request("http://x/api/state?since=2"))).json();
    expect(shared.version).toBe(3);
    expect(shared.data.offers.at(-1)).toMatchObject({ from: "Sam", date: "2099-01-05" });
    expect(shared.data.shifts.find((s: { id: string }) => s.id === "s-mon").body.stress).toHaveLength(20);
  });

  it("never builds on an empty week in place of one it can't read; only a new session replaces it", async () => {
    g.__offshiftState = { version: 9, client: null, data: { schema: 1, shifts: "old" } };
    const name = await team.POST(new Request("http://x/api/team", { method: "POST", body: JSON.stringify({ action: "name", name: "Jo" }) }));
    expect(name.status).toBe(409);
    expect(g.__offshiftState!.version).toBe(9);
    const fresh = await team.POST(new Request("http://x/api/team", { method: "POST", body: JSON.stringify({ action: "new-session" }) }));
    expect(fresh.status).toBe(200);
    expect(g.__offshiftState!.version).toBe(10);
  });

  it("keeps a long session's log within what a week may hold", async () => {
    const w = week();
    g.__offshiftState = { version: 1, client: null, data: { ...w, sync: Array.from({ length: 499 }, (_, i) => ({ id: `y${i}`, at: AT.toISOString(), from: "Alex", to: "Offshift", text: "Ask." })) } };
    for (let i = 0; i < 3; i++) await team.POST(new Request("http://x/api/team", { method: "POST", body: JSON.stringify({ action: "send-ask", ask: { from: "Sam", workplace: "Café", date: "2099-01-05", start: "09:00", end: "13:00" } }) }));
    const saved = g.__offshiftState!.data as DataSlice;
    expect(saved.sync.length).toBe(500);
    expect(saved.offers.length).toBe(4);
  });

  it("never starts a week by itself: New session does", async () => {
    g.__offshiftState = { version: 0, client: null, data: null };
    const res = await team.POST(new Request("http://x/api/team", { method: "POST", body: JSON.stringify({ action: "send-ask", ask: { from: "Sam", workplace: "Café", date: "2099-01-05", start: "09:00", end: "13:00" } }) }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/New session/);
  });

  it("refuses what it can't use", async () => {
    const bad = await team.POST(new Request("http://x/api/team", { method: "POST", body: JSON.stringify({ action: "send-ask", ask: { from: "", workplace: "Café", date: "2099-01-05", start: "09:00", end: "13:00" } }) }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe("Who is asking?");
    expect((await team.POST(new Request("http://x/api/team", { method: "POST", body: "nope" }))).status).toBe(400);
    expect(g.__offshiftState!.version).toBe(2);
  });
});
