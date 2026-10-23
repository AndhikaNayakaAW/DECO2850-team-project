import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultTestOffer, submitTestOffer } from "@/lib/test-offer";
import { week, NOW } from "./fixture";

process.env.OFFSHIFT_STATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "offshift-calendar-offer-")), "state.json");
const team = await import("@/app/api/team/route");
const watch = await import("@/app/api/watch/route");
const state = await import("@/app/api/state/route");
const g = globalThis as unknown as { __offshiftState?: { version: number; client: string | null; data: unknown } };
const input = { from: "Alex", workplace: "Test café", date: "2099-01-05", start: "16:00", end: "21:00", note: "Can you cover this shift?" };

describe("calendar test-offer delivery", () => {
  beforeEach(() => {
    g.__offshiftState = { version: 7, client: null, data: { ...week(), offers: [], messages: [] } };
  });

  it("defaults to tomorrow when the selected day is today or earlier, including across year end", () => {
    expect(defaultTestOffer("2026-10-20", NOW)).toMatchObject({ date: "2026-10-23", start: "16:00", end: "21:00" });
    expect(defaultTestOffer("2026-10-22", NOW).date).toBe("2026-10-23");
    expect(defaultTestOffer("2026-12-31", { date: "2026-12-31" }).date).toBe("2027-01-01");
    expect(defaultTestOffer("2026-11-02", NOW).date).toBe("2026-11-02");
  });

  it("rejects invalid or past offers before sending any request", async () => {
    const request = vi.fn<typeof fetch>();
    await expect(submitTestOffer({ ...input, from: " " }, NOW, request)).rejects.toThrow("Who is asking?");
    await expect(submitTestOffer({ ...input, date: NOW.date, start: "09:00" }, NOW, request)).rejects.toThrow("That time has passed.");
    await expect(submitTestOffer({ ...input, end: input.start }, NOW, request)).rejects.toThrow("The shift needs a length.");
    expect(request).not.toHaveBeenCalled();
  });

  it.each(["accept", "decline"])("sends from the calendar to the watch, then persists the watch's %s answer", async (decision) => {
    const initial = structuredClone(g.__offshiftState!.data) as ReturnType<typeof week>;
    const request = vi.fn<typeof fetch>(async (url, init) => {
      expect(url).toBe("/api/team");
      expect(init?.credentials).toBe("same-origin");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init!.body as string)).toEqual({ action: "send-ask", ask: input });
      return team.POST(new Request("http://local/api/team", init));
    });
    await submitTestOffer(input, NOW, request);
    expect(request).toHaveBeenCalledTimes(1);
    const wrist = await (await watch.GET()).json();
    expect(wrist.ask).toMatchObject({ from: input.from, employer: "Test cafe", note: input.note, status: "pending" });
    const beforeReply = await (await state.GET(new Request("http://local/api/state"))).json();
    expect(beforeReply.data.shifts).toEqual(initial.shifts);
    expect(beforeReply.data.personal).toEqual(initial.personal);
    expect(beforeReply.data.uni).toEqual(initial.uni);

    const reply = await watch.POST(new Request("http://local/api/watch", { method: "POST", body: JSON.stringify({ answer: { offerId: wrist.ask.id, decision } }) }));
    expect(reply.status).toBe(200);
    const shared = await (await state.GET(new Request("http://local/api/state"))).json();
    expect(shared.data.offers[0].status).toBe(decision === "accept" ? "accepted" : "declined");
    expect(shared.data.shifts).toHaveLength(initial.shifts.length + (decision === "accept" ? 1 : 0));
    expect(shared.data.messages.filter((m: { from: string }) => m.from === "worker")).toHaveLength(0);
    expect(shared.data.personal).toEqual(initial.personal);
  });

  it.each([401, 403])("explains expired access instead of claiming delivery (%s)", async (status) => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("Access needed", { status }));
    await expect(submitTestOffer(input, NOW, request)).rejects.toThrow(/access code/i);
  });

  it("keeps the server's validation problem available for correction", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ error: "That time has passed." }, { status: 400 }));
    await expect(submitTestOffer(input, NOW, request)).rejects.toThrow("That time has passed.");
  });

  it("does not automatically resend when the network fails", async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(submitTestOffer(input, NOW, request)).rejects.toThrow(/check the calendar before retrying/i);
    expect(request).toHaveBeenCalledTimes(1);
    expect(g.__offshiftState!.version).toBe(7);
  });

  it.each([new Response("Unavailable", { status: 503 }), Response.json({}), Response.json({ version: 8, asks: [] }), Response.json({ version: 8, asks: [{ ...input, id: "other", from: "Another sender", status: "pending" }] }), new Response("<html>Access</html>")])("does not show success for an unavailable or malformed response", async (response) => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(submitTestOffer(input, NOW, request)).rejects.toThrow(/check the calendar before retrying/i);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
