import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as actions from "@/lib/actions";
import { dayItems } from "@/lib/checks";
import { WATCH_DECISIONS, watchSummary } from "@/lib/garmin";
import { applyTeamAction } from "@/lib/team";
import type { DataSlice, Decision } from "@/lib/types";
import { cleanData } from "@/lib/validate";
import { AT, ask, week } from "./fixture";

process.env.OFFSHIFT_STATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "offshift-answers-")), "state.json");
const watchRoute = await import("@/app/api/watch/route");

const answer = (data: DataSlice, decision: string) => actions.applyResponse(data, "o-thu", decision as Decision, AT as never);
const askOnThursday = (data: DataSlice) => dayItems(data, "2026-10-22").find((it) => it.offerId === "o-thu");

describe("an ask has three answers: accept, decline, later", () => {
  it("accept puts the shift on the week and sends no message", () => {
    const r = answer(week(), "accept")!;
    expect(r.data.offers[0].status).toBe("accepted");
    expect(r.data.shifts.filter((s) => s.viaOffer === "o-thu")).toEqual([expect.objectContaining({ date: "2026-10-22", start: "16:00", end: "21:00", workplace: "Café" })]);
    expect(r.data.messages).toEqual(week().messages);
    expect(r.toast).not.toMatch(/sent/i);
  });

  it("decline takes the ask off the week and sends no message", () => {
    const r = answer(week(), "decline")!;
    expect(r.data.offers[0].status).toBe("declined");
    expect(r.data.shifts.some((s) => s.viaOffer === "o-thu")).toBe(false);
    expect(askOnThursday(r.data)).toBeUndefined();
    expect(r.data.messages).toEqual(week().messages);
  });

  it("later leaves a see-through block to press, with no reminder and no message", () => {
    const r = answer(week(), "later")!;
    expect(r.data.offers[0].status).toBe("deferred");
    expect(r.data.offers[0]).not.toHaveProperty("reminderAt");
    expect(askOnThursday(r.data)).toEqual(expect.objectContaining({ kind: "offer", later: true }));
    expect(askOnThursday(week())).not.toHaveProperty("later", true);
    expect(r.data.messages).toEqual(week().messages);
  });

  it("an ask saved for later can still be accepted or declined", () => {
    const later = answer(week(), "later")!.data;
    expect(answer(later, "accept")!.data.offers[0].status).toBe("accepted");
    expect(answer(later, "decline")!.data.offers[0].status).toBe("declined");
  });

  it("there is no other time, swap or drafted reply any more", () => {
    expect(answer(week(), "negotiate")).toBeNull();
    expect(answer(week(), "swap")).toBeNull();
    expect(WATCH_DECISIONS).toEqual(["accept", "decline", "later"]);
    expect(applyTeamAction(week(), { action: "resolve", offerId: "o-thu", how: "confirm-alt" }, AT)).toEqual({ problem: "Unknown action." });
  });

  it("undo puts an accepted or declined ask back, and takes its shift off again", () => {
    const accepted = answer(week(), "accept")!.data;
    const back = actions.unanswer(accepted, "o-thu");
    expect(back.offers[0].status).toBe("pending");
    expect(back.shifts.some((s) => s.viaOffer === "o-thu")).toBe(false);
    expect(askOnThursday(back)).toBeDefined();
    expect(actions.unanswer(answer(week(), "decline")!.data, "o-thu").offers[0].status).toBe("pending");
  });
});

describe("the watch answers the same three ways", () => {
  it("refuses another time and swap from an older watch build", async () => {
    const g = globalThis as { __offshiftState?: { version: number; client: string | null; data: DataSlice } };
    for (const decision of ["negotiate", "swap"]) {
      g.__offshiftState = { version: 0, client: null, data: week() };
      const res = await watchRoute.POST(new Request("http://x/api/watch", { method: "POST", body: JSON.stringify({ answer: { offerId: "o-thu", decision } }) }));
      expect(res.status).toBe(400);
    }
    g.__offshiftState = { version: 0, client: null, data: week() };
    const ok = await watchRoute.POST(new Request("http://x/api/watch", { method: "POST", body: JSON.stringify({ answer: { offerId: "o-thu", decision: "decline" } }) }));
    expect(ok.status).toBe(200);
    expect(g.__offshiftState.data.messages).toEqual(week().messages);
  });

  it("shows an ask saved for later as saved, not as a reminder time", () => {
    const later = answer(week(), "later")!.data;
    expect(watchSummary(later, AT).ask).toEqual(expect.objectContaining({ status: "deferred" }));
    expect(watchSummary(later, AT).ask?.reminder).not.toMatch(/\d/);
  });
});

describe("a week saved before this change still opens", () => {
  it("turns old counter-offer and swap answers into accepted or declined", () => {
    const old = (status: string) => cleanData({ ...week(), offers: [{ ...ask(), status, alt: { date: "2026-10-23", start: "16:00", end: "21:00", label: "Fri 4-9 pm" }, colleague: "Jo" }] });
    expect(old("countered")?.offers[0].status).toBe("declined");
    expect(old("swap-requested")?.offers[0].status).toBe("declined");
    expect(old("swapped")?.offers[0].status).toBe("declined");
    expect(old("alt-confirmed")?.offers[0].status).toBe("accepted");
    expect(old("countered")?.offers[0]).not.toHaveProperty("alt");
    expect(old("swapped")?.offers[0]).not.toHaveProperty("colleague");
  });
});
