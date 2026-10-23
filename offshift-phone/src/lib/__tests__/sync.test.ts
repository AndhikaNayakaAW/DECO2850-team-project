import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataSlice } from "@/lib/types";
import { ask, week } from "./fixture";

/**
 * Runs the real SyncProvider effect against the real /api/state handlers: React's hooks are stubbed so the
 * effect runs on its own, and fetch goes straight into the route. The device's saved copy is what zustand persisted.
 */
let cleanup: (() => void) | undefined;
vi.mock("react", () => {
  const api = {
    useState: (init: unknown) => [typeof init === "function" ? (init as () => unknown)() : init, () => {}],
    useEffect: (fn: () => (() => void) | void) => {
      const c = fn();
      if (typeof c === "function") cleanup = c;
    },
    useSyncExternalStore: () => false,
    useDebugValue: () => {},
  };
  return { ...api, default: api };
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Saved = { version: number; client: string | null; data: unknown };
const g = globalThis as unknown as { __offshiftState?: Saved; localStorage: unknown; window: unknown; document: unknown };
const disk = new Map<string, string>();
g.localStorage = { getItem: (k: string) => disk.get(k) ?? null, setItem: (k: string, v: string) => void disk.set(k, v), removeItem: (k: string) => void disk.delete(k) };
g.window = { location: { search: "", pathname: "/calendar" }, history: { replaceState() {} } };
g.document = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };
process.env.OFFSHIFT_STATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "offshift-sync-")), "state.json");

const run = { id: "p-run", date: "2026-10-21", start: "07:00", end: "08:00", title: "Run", category: "personal" as const, importance: "flexible" as const };
const withoutAsks = (d: DataSlice): DataSlice => ({ ...d, offers: [], messages: [] });

/** Opens the calendar on a device holding `local` (and optionally its last agreed week), against a server holding `server`. */
async function open(opts: { server: Saved; local: DataSlice; meta?: { version: number; base: DataSlice }; slowGet?: number; saved?: Record<string, string> }) {
  vi.resetModules();
  disk.clear();
  disk.set("offshift-calendar-v2", JSON.stringify({ state: opts.local, version: 0 }));
  if (opts.meta) disk.set("offshift-sync-v2", JSON.stringify(opts.meta));
  for (const [k, v] of Object.entries(opts.saved ?? {})) disk.set(k, v);
  g.__offshiftState = structuredClone(opts.server);
  const route = await import("@/app/api/state/route");
  const requests: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const req = new Request(`http://localhost${url}`, init);
    if (req.method === "GET") await sleep(opts.slowGet ?? 0);
    const res = req.method === "PUT" ? await route.PUT(req) : await route.GET(req);
    requests.push(`${req.method} ${res.status}`);
    return res;
  });
  const { useStore } = await import("@/lib/store");
  const SyncProvider = (await import("@/lib/sync")).default;
  SyncProvider();
  return { useStore, requests, server: () => g.__offshiftState! as { version: number; data: DataSlice } };
}

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.unstubAllGlobals();
});

describe("opening the calendar", () => {
  it("wipes the reflections and imported heart rate the removed watch preview kept in this browser", async () => {
    const shared = week();
    const leftover = JSON.stringify({ state: { session: shared.sessionStartedAt, reflections: { "2026-10-21": "tired after close" }, readings: [{ bpm: 88 }] }, version: 0 });
    await open({ server: { version: 5, client: "team", data: shared }, local: shared, saved: { "offshift-private-watch-v1": leftover } });
    await sleep(300);
    expect(disk.has("offshift-private-watch-v1")).toBe(false);
  });

  it("takes the shared week instead of overwriting it with the device's saved copy, even when the server is slow", async () => {
    const shared = week();
    const app = await open({ server: { version: 5, client: "team", data: shared }, local: withoutAsks(shared), slowGet: 400 });
    await sleep(900);
    expect(app.server().version).toBe(5);
    expect(app.server().data.offers.map((o) => o.id)).toEqual(["o-thu"]);
    expect(app.useStore.getState().offers.map((o) => o.id)).toEqual(["o-thu"]);
    expect(app.requests).not.toContain("PUT 200");
  });

  it("brings back edits made offline last time, merged with what changed on the server meanwhile", async () => {
    const before = week();
    const team = { ...before, offers: [...before.offers, ask({ id: "o-sat", date: "2026-10-24" })] };
    const app = await open({ server: { version: 5, client: "team", data: team }, local: { ...before, personal: [...before.personal, run] }, meta: { version: 4, base: before } });
    await sleep(600);
    expect(app.server().version).toBe(6);
    expect(app.server().data.offers.map((o) => o.id)).toEqual(["o-thu", "o-sat"]);
    expect(app.server().data.personal.map((p) => p.id)).toContain("p-run");
    expect(app.useStore.getState().offers.map((o) => o.id)).toEqual(["o-thu", "o-sat"]);
  });

  it("never lets the last participant's saved week into a new session", async () => {
    const last = week();
    const next = { ...withoutAsks(week()), sessionStartedAt: "2026-10-22T05:00:00.000Z", shifts: [], uni: [], personal: [], settings: { ...last.settings, name: "" } };
    const app = await open({ server: { version: 9, client: "team", data: next }, local: last, meta: { version: 8, base: last } });
    await sleep(600);
    expect(app.server().data.sessionStartedAt).toBe(next.sessionStartedAt);
    expect(app.server().data.shifts).toEqual([]);
    expect(app.useStore.getState().settings.name).toBe("");
    expect(app.useStore.getState().shifts).toEqual([]);
  });

  it("tries again when its first save to an empty server failed", async () => {
    vi.resetModules();
    disk.clear();
    const mine = week();
    disk.set("offshift-calendar-v2", JSON.stringify({ state: mine, version: 0 }));
    g.__offshiftState = { version: 0, client: null, data: null };
    const route = await import("@/app/api/state/route");
    let puts = 0;
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      const req = new Request(`http://localhost${url}`, init);
      if (req.method === "PUT" && ++puts === 1) return new Response("busy", { status: 503 });
      return req.method === "PUT" ? route.PUT(req) : route.GET(req);
    });
    (await import("@/lib/sync")).default();
    await sleep(2500);
    expect(puts).toBeGreaterThanOrEqual(2);
    expect((g.__offshiftState!.data as DataSlice).offers.map((o) => o.id)).toEqual(["o-thu"]);
  });

  it("gives a new deployment the device's week", async () => {
    const mine = week();
    const app = await open({ server: { version: 0, client: null, data: null }, local: mine });
    await sleep(500);
    expect(app.server().data.offers.map((o) => o.id)).toEqual(["o-thu"]);
  });

  it("keeps the store's actions whatever the server sends", async () => {
    const app = await open({ server: { version: 3, client: "x", data: { ...week(), respondToOffer: null } }, local: week() });
    await sleep(400);
    expect(typeof app.useStore.getState().respondToOffer).toBe("function");
  });
});

describe("a change the week can't hold", () => {
  const longTitle = "Study group at the library to finish the group assignment draft before the deadline";

  it("is refused on the device with a message, so sync carries on with everything else", async () => {
    const w = week();
    const app = await open({ server: { version: 5, client: "x", data: w }, local: w, meta: { version: 5, base: w } });
    await sleep(300);
    app.useStore.getState().addPersonal({ date: "2026-10-23", start: "18:00", end: "19:00", title: longTitle, category: "study", importance: "flexible" });
    app.useStore.getState().addPersonal({ date: "2026-10-23", start: "", end: "19:00", title: "Rest", category: "rest", importance: "protected" });
    expect(app.useStore.getState().personal).toHaveLength(w.personal.length);
    expect(app.useStore.getState().toast).toMatch(/couldn't be saved/);
    app.useStore.getState().addShift({ date: "2026-10-25", start: "09:00", end: "13:00", workplace: "Café" });
    await sleep(900);
    expect(app.requests).not.toContain("PUT 400");
    expect(app.server().data.shifts.some((s) => s.date === "2026-10-25")).toBe(true);
  });

  it("left in this device's storage by an older version never wipes the shared week on reload", async () => {
    const w = week();
    const saved = { ...w, personal: [...w.personal, { id: "p-long", date: "2026-10-23", start: "18:00", end: "19:00", title: longTitle, category: "study" as const, importance: "flexible" as const }] };
    const app = await open({ server: { version: 5, client: "x", data: w }, local: saved, meta: { version: 5, base: w } });
    await sleep(700);
    expect(app.server().version).toBe(5);
    expect(app.server().data.sessionStartedAt).toBe(w.sessionStartedAt);
    expect(app.useStore.getState().offers.map((o) => o.id)).toEqual(["o-thu"]);
  });

  it("waits for the server when it has never had a week, rather than let the worker type into nothing", async () => {
    vi.resetModules();
    disk.clear();
    g.__offshiftState = { version: 4, client: "team", data: week() };
    const route = await import("@/app/api/state/route");
    let offline = true;
    const requests: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (offline) throw new TypeError("Failed to fetch");
      const req = new Request(`http://localhost${url}`, init);
      const res = req.method === "PUT" ? await route.PUT(req) : await route.GET(req);
      requests.push(`${req.method} ${res.status}`);
      return res;
    });
    const { useStore, UNLOADED } = await import("@/lib/store");
    (await import("@/lib/sync")).default();
    await sleep(300);
    expect(useStore.getState().sessionStartedAt).toBe(UNLOADED);
    offline = false;
    await sleep(2300);
    expect(useStore.getState().offers.map((o) => o.id)).toEqual(["o-thu"]);
    expect(requests.filter((r) => r.startsWith("PUT"))).toEqual([]);
  });

  it("and a device with nothing saved never sends its placeholder week", async () => {
    const shared = week();
    const app = await open({ server: { version: 2, client: "x", data: shared }, local: { ...shared, sessionStartedAt: new Date(0).toISOString() } });
    await sleep(500);
    expect(app.server().version).toBe(2);
    expect(app.useStore.getState().sessionStartedAt).toBe(shared.sessionStartedAt);
  });
});

describe("/api/state guards the shared week", () => {
  const put = async (body: unknown) => {
    const route = await import("@/app/api/state/route");
    return route.PUT(new Request("http://x/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  };

  it("refuses a write from a device that hasn't synced, and hands it the current week instead", async () => {
    g.__offshiftState = { version: 5, client: "team", data: week() };
    const res = await put({ data: withoutAsks(week()), base: null, baseVersion: -1, client: "phone" });
    expect(res.status).toBe(409);
    expect((await res.json()).data.offers).toHaveLength(1);
    expect(g.__offshiftState.version).toBe(5);
  });

  it("refuses a base without its version, which would otherwise overwrite newer asks", async () => {
    g.__offshiftState = { version: 3, client: null, data: week() };
    expect((await put({ data: withoutAsks(week()), base: week() })).status).toBe(400);
    expect((g.__offshiftState.data as DataSlice).offers).toHaveLength(1);
  });

  it("refuses malformed weeks", async () => {
    g.__offshiftState = { version: 1, client: null, data: week() };
    expect((await put({ data: { schema: 2, shifts: [], settings: null }, base: week(), baseVersion: 1 })).status).toBe(400);
    const twice = week();
    expect((await put({ data: { ...twice, shifts: [twice.shifts[0], twice.shifts[0]] }, base: week(), baseVersion: 1 })).status).toBe(400);
    expect((await put({ data: { ...week(), settings: { ...week().settings, timeZone: "Mars/Olympus" } }, base: week(), baseVersion: 1 })).status).toBe(400);
    expect(g.__offshiftState.version).toBe(1);
  });

  it("says which session is running, for pages that keep private data per session", async () => {
    g.__offshiftState = { version: 3, client: null, data: week() };
    const route = await import("@/app/api/state/route");
    const j = await (await route.GET(new Request("http://x/api/state?session=1"))).json();
    expect(j).toEqual({ version: 3, session: week().sessionStartedAt });
  });

  it("starts an empty session when the week is cleared, which every device picks up", async () => {
    g.__offshiftState = { version: 7, client: null, data: week() };
    const route = await import("@/app/api/state/route");
    await route.DELETE();
    const j = await (await route.GET(new Request("http://x/api/state?since=7"))).json();
    expect(j.version).toBe(8);
    expect(j.data.offers).toEqual([]);
    expect(j.data.sessionStartedAt).not.toBe(week().sessionStartedAt);
  });
});
