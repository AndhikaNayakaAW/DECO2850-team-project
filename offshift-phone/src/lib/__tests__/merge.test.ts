import { describe, expect, it } from "vitest";
import { applyResponse } from "@/lib/actions";
import { mergeData } from "@/lib/merge";
import { emptyData } from "@/lib/session";
import type { DataSlice } from "@/lib/types";
import { week } from "./fixture";

const AT = new Date("2026-10-22T03:00:00Z");
function base(): DataSlice {
  const d = emptyData(AT);
  return {
    ...d,
    shifts: [{ id: "s1", date: "2026-10-22", start: "10:00", end: "14:00", workplace: "Café" }],
    personal: [
      { id: "p1", date: "2026-10-22", start: "19:00", end: "20:00", title: "Dinner" },
      { id: "p2", date: "2026-10-23", start: "18:00", end: "19:00", title: "Gym" },
    ],
  };
}
const ask = { id: "o1", from: "Alex", workplace: "Café", date: "2026-10-22", start: "16:00", end: "21:00", note: "Can you cover?", sentAt: AT.toISOString(), status: "pending" as const };

describe("merging a device's edits with what reached the server meanwhile", () => {
  it("keeps the team's new ask and the worker's new shift", () => {
    const b = base();
    const server = { ...b, offers: [ask] };
    const client = { ...b, shifts: [...b.shifts, { id: "s2", date: "2026-10-24", start: "09:00", end: "13:00", workplace: "Café" }] };
    const merged = mergeData(b, server, client);
    expect(merged.offers.map((o) => o.id)).toEqual(["o1"]);
    expect(merged.shifts.map((s) => s.id)).toEqual(["s1", "s2"]);
  });
  it("keeps an answer from the watch when the worker moved a plan at the same moment", () => {
    const b = { ...base(), offers: [ask] };
    const server = { ...b, offers: [{ ...ask, status: "accepted" as const }], shifts: [...b.shifts, { id: "s9", date: "2026-10-22", start: "16:00", end: "21:00", workplace: "Café", viaOffer: "o1" }] };
    const client = { ...b, personal: b.personal.map((p) => (p.id === "p2" ? { ...p, date: "2026-10-24" } : p)) };
    const merged = mergeData(b, server, client);
    expect(merged.offers[0].status).toBe("accepted");
    expect(merged.shifts.map((s) => s.id)).toEqual(["s1", "s9"]);
    expect(merged.personal.find((p) => p.id === "p2")?.date).toBe("2026-10-24");
  });
  it("removes what the worker deleted and keeps what the server changed", () => {
    const b = base();
    const server = { ...b, shifts: [{ ...b.shifts[0], rated: "tired" as const }] };
    const client = { ...b, personal: b.personal.filter((p) => p.id !== "p1") };
    const merged = mergeData(b, server, client);
    expect(merged.personal.map((p) => p.id)).toEqual(["p2"]);
    expect(merged.shifts[0].rated).toBe("tired");
  });
  it("lets the worker's change to an item win over the server's copy of the old one", () => {
    const b = base();
    const server = { ...b };
    const client = { ...b, personal: b.personal.map((p) => (p.id === "p1" ? { ...p, title: "Dinner with Mum" } : p)) };
    expect(mergeData(b, server, client).personal[0].title).toBe("Dinner with Mum");
  });
  it("keeps a body reading from the watch and the worker's new settings", () => {
    const b = base();
    const server = { ...b, wearable: { level: 1 as const, word: "Running low", at: "13:00", source: "Garmin" } };
    const client = { ...b, settings: { ...b.settings, name: "Sam" } };
    const merged = mergeData(b, server, client);
    expect(merged.wearable?.word).toBe("Running low");
    expect(merged.settings.name).toBe("Sam");
  });
  it("drops a device's edits when the team started a new session meanwhile", () => {
    const b = base();
    const server = emptyData(new Date("2026-10-22T05:00:00Z"));
    const client = { ...b, personal: [] };
    expect(mergeData(b, server, client)).toBe(server);
  });
  it("lets a device that started the new session replace the old week", () => {
    const b = base();
    const server = { ...b, offers: [ask] };
    const client = emptyData(new Date("2026-10-22T05:00:00Z"));
    expect(mergeData(b, server, client)).toBe(client);
  });
});

describe("merging settings and answers", () => {
  it("keeps the team's name and the worker's protected plan when both change at once", () => {
    const base = week();
    const server = { ...base, settings: { ...base.settings, name: "Jo" } };
    const client = { ...base, settings: { ...base.settings, protectedIds: ["p-thu"], tone: "plain" as const } };
    const merged = mergeData(base, server, client);
    expect(merged.settings).toMatchObject({ name: "Jo", tone: "plain", protectedIds: ["p-thu"] });
  });
  it("merges protected plans as a set", () => {
    const base = { ...week(), settings: { ...week().settings, protectedIds: ["a", "b"] } };
    const server = { ...base, settings: { ...base.settings, protectedIds: ["a", "b", "c"] } };
    const client = { ...base, settings: { ...base.settings, protectedIds: ["b"] } };
    expect(mergeData(base, server, client).settings.protectedIds).toEqual(["b", "c"]);
  });
  it("lets the first answer to an ask stand, and drops the second device's reply and shift", () => {
    const base = week();
    const watch = applyResponse(base, "o-thu", "decline", "Not tonight, sorry.", {}, AT)!.data;
    const calendar = applyResponse(base, "o-thu", "accept", "Yes, I can.", {}, AT)!.data;
    const merged = mergeData(base, watch, calendar);
    expect(merged.offers[0].status).toBe("declined");
    expect(merged.messages.filter((m) => m.offerId === "o-thu").map((m) => m.text)).toEqual(["Not tonight, sorry."]);
    expect(merged.shifts.some((s) => s.viaOffer === "o-thu")).toBe(false);
    expect(merged.sync.filter((e) => e.offerId === "o-thu").map((e) => e.text)).toEqual(["Declined Thu 22 Oct 4–9 pm."]);
  });
});
