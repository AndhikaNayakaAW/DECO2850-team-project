import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { week } from "./fixture";

process.env.OFFSHIFT_STATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "offshift-")), "state.json");
const { GET, POST } = await import("@/app/api/watch/route");
const state = await import("@/app/api/state/route");

type Saved = { version: number; client: string | null; data: ReturnType<typeof week> | null };
const g = globalThis as { __offshiftState?: Saved; __offshiftWatchSeen?: string };
const post = (body: unknown) => POST(new Request("http://x/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const put = (body: unknown) => state.PUT(new Request("http://x/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("/api/watch", () => {
  beforeEach(() => {
    g.__offshiftState = { version: 0, client: null, data: week() };
    g.__offshiftWatchSeen = undefined;
  });
  it("has nothing waiting before any device has synced, and notes that the watch checked in", async () => {
    g.__offshiftState = { version: 0, client: null, data: null };
    const j = await (await GET()).json();
    expect(j.ask).toBeNull();
    expect(g.__offshiftWatchSeen).toBeTruthy();
  });
  it("ignores a week saved by an older version", async () => {
    g.__offshiftState = { version: 3, client: null, data: { clock: "13:02", shifts: [] } as unknown as ReturnType<typeof week> };
    expect((await (await GET()).json()).ask).toBeNull();
  });
  it("applies an answer and bumps the shared version so the calendar picks it up", async () => {
    const res = await post({ answer: { offerId: "o-thu", decision: "decline" } });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.ask).toBeNull();
    expect(j.v).toBe(1);
    expect(j.toast).toBe("Declined. Thursday stays as it is.");
  });
  it("rejects answers it doesn't understand", async () => {
    expect((await post({ answer: { offerId: "o-thu", decision: "maybe" } })).status).toBe(400);
    expect((await post({ answer: { offerId: "missing", decision: "accept" } })).status).toBe(404);
    await post({ answer: { offerId: "o-thu", decision: "accept" } });
    expect((await post({ answer: { offerId: "o-thu", decision: "decline" } })).status).toBe(409);
  });
  it("never starts a week from the wrist", async () => {
    g.__offshiftState = { version: 0, client: null, data: null };
    expect((await post({ health: { energy: 1 } })).status).toBe(409);
    expect(g.__offshiftState!.data).toBeNull();
  });
  it("takes an older watch's all-day reading without keeping it, so that watch never shows an error", async () => {
    expect((await post({ health: { energy: 1, sleep: 1, stress: 2, at: "21:02" } })).status).toBe(200);
    expect((await post({ body: { level: 1 } })).status).toBe(200);
    expect(JSON.stringify(g.__offshiftState!.data)).not.toMatch(/Running low|energy|wearable/);
  });
});

describe("/api/state", () => {
  beforeEach(() => {
    g.__offshiftState = { version: 4, client: null, data: week() };
  });
  it("merges a device's stale edit with an answer that reached the server meanwhile", async () => {
    const base = week();
    await post({ answer: { offerId: "o-thu", decision: "accept" } });
    const edited = { ...base, personal: base.personal.filter((p) => p.id !== "p-tue") };
    const res = await put({ data: edited, base, baseVersion: 4, client: "ipad" });
    const j = await res.json();
    expect(j.version).toBe(6);
    expect(j.data.offers[0].status).toBe("accepted");
    expect(j.data.personal.map((p: { id: string }) => p.id)).toEqual(["p-thu"]);
  });
  it("takes a device's week as it is when nothing else changed", async () => {
    const edited = { ...week(), personal: [] };
    const j = await (await put({ data: edited, base: week(), baseVersion: 4, client: "ipad" })).json();
    expect(j).toEqual({ version: 5 });
    expect(g.__offshiftState!.data!.personal).toEqual([]);
  });
  it("refuses a week in an older shape", async () => {
    expect((await put({ data: { clock: "13:02" }, client: "old" })).status).toBe(400);
  });
});
