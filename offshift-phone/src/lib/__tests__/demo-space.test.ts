import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { week } from "./fixture";

process.env.OFFSHIFT_STATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "offshift-")), "state.json");
const live = { state: await import("@/app/api/state/route"), watch: await import("@/app/api/watch/route") };
const demo = { state: await import("@/app/api/demo/state/route"), watch: await import("@/app/api/demo/watch/route"), team: await import("@/app/api/demo/team/route") };
const { proxy } = await import("@/proxy");

type Saved = { version: number; client: string | null; data: ReturnType<typeof week> | null };
const g = globalThis as { __offshiftState?: Saved; __offshiftDemoState?: Saved; __offshiftWatchSeen?: string; __offshiftDemoWatchSeen?: string };
const json = (method: string, url: string, body: unknown) => new Request(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("the exhibition demo has its own week", () => {
  beforeEach(() => {
    g.__offshiftState = { version: 4, client: null, data: week() };
    g.__offshiftDemoState = undefined;
    g.__offshiftWatchSeen = undefined;
    g.__offshiftDemoWatchSeen = undefined;
  });

  it("starts the demo scenario when the demo page resets it, and leaves the participant's week alone", async () => {
    const before = JSON.stringify(g.__offshiftState);
    const res = await demo.state.DELETE();
    expect(res.status).toBe(200);
    const j = await (await demo.state.GET(new Request("http://x/api/demo/state"))).json();
    expect(j.data.offers.some((o: { from: string; status: string }) => o.from === "Sam" && o.status === "pending")).toBe(true);
    expect(JSON.stringify(g.__offshiftState)).toBe(before);
  });

  it("gives the demo watch the demo ask, and the normal watch the participant's", async () => {
    await demo.state.DELETE();
    expect((await (await demo.watch.GET()).json()).ask.from).toBe("Sam");
    expect((await (await live.watch.GET()).json()).ask.from).toBe("Alex");
    expect(g.__offshiftDemoWatchSeen).toBeTruthy();
  });

  it("saves an answer from the demo watch in the demo week only", async () => {
    await demo.state.DELETE();
    const ask = (await (await demo.watch.GET()).json()).ask;
    const res = await demo.watch.POST(json("POST", "http://x/api/demo/watch", { answer: { offerId: ask.id, decision: "decline" } }));
    expect(res.status).toBe(200);
    expect(g.__offshiftDemoState!.data!.offers.find((o) => o.id === ask.id)!.status).toBe("declined");
    expect(g.__offshiftState!.data!.offers[0].status).toBe("pending");
    expect(g.__offshiftState!.version).toBe(4);
  });

  it("lets the demo's Test offer send an ask to the demo week only", async () => {
    await demo.state.DELETE();
    const tomorrow = new Date(Date.now() + 36 * 3600_000).toISOString().slice(0, 10);
    const res = await demo.team.POST(json("POST", "http://x/api/demo/team", { action: "send-ask", ask: { from: "Jo", workplace: "Cafe", date: tomorrow, start: "16:00", end: "20:00" } }));
    expect(res.status).toBe(200);
    expect(g.__offshiftDemoState!.data!.offers.some((o) => o.from === "Jo")).toBe(true);
    expect(g.__offshiftState!.data!.offers.some((o) => o.from === "Jo")).toBe(false);
  });

  it("syncs a demo page through the demo week, never the participant's", async () => {
    await demo.state.DELETE();
    const j = await (await demo.state.GET(new Request("http://x/api/demo/state?since=-1"))).json();
    const res = await demo.state.PUT(json("PUT", "http://x/api/demo/state", { data: { ...j.data, settings: { ...j.data.settings, name: "Visitor" } }, base: j.data, baseVersion: j.version, client: "t" }));
    expect(res.status).toBe(200);
    expect(g.__offshiftDemoState!.data!.settings.name).toBe("Visitor");
    expect(g.__offshiftState!.data!.settings.name).toBe("Sam");
  });
});

describe("the demo watch's address", () => {
  const CODE = "maple-river-42";
  const req = (p: string) => new NextRequest(`https://offshift.example${p}`);
  afterEach(() => {
    delete process.env.OFFSHIFT_ACCESS_CODE;
  });

  it("reaches the demo watch route", () => {
    delete process.env.OFFSHIFT_ACCESS_CODE;
    expect(proxy(req("/demo/api/watch")).headers.get("x-middleware-rewrite")).toBe("https://offshift.example/api/demo/watch");
  });

  it("carries the access code like the normal watch, when there is one", () => {
    process.env.OFFSHIFT_ACCESS_CODE = CODE;
    expect(proxy(req(`/w/${CODE}/demo/api/watch`)).headers.get("x-middleware-rewrite")).toBe("https://offshift.example/api/demo/watch");
    expect(proxy(req("/w/guess/demo/api/watch")).status).toBe(401);
    expect(proxy(req("/demo/api/watch")).status).toBe(401);
  });
});
