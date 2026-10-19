import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retrying, StaleWrite } from "@/lib/server-state";
import type { DataSlice } from "@/lib/types";
import { week } from "./fixture";

/** A stand-in for Upstash's REST API: GET, SET, MGET, and the compare-and-set script. */
const db = new Map<string, string>();
let commands: string[] = [];
/** Runs once, just before the next compare-and-set: another server instance saving first. */
let meanwhile: (() => void) | null = null;

function redis(command: (string | number)[]): unknown {
  const [name, ...args] = command.map(String);
  commands.push(name);
  if (name === "GET") return db.get(args[0]) ?? null;
  if (name === "SET") return db.set(args[0], args[1]) && "OK";
  if (name === "MGET") return args.map((k) => db.get(k) ?? null);
  if (name === "EVAL") {
    const [, , key, expected, json] = args;
    const before = meanwhile;
    meanwhile = null;
    before?.();
    const current = Number(/^\{"version":(\d+)/.exec(db.get(key) ?? "")?.[1] ?? 0);
    if (current !== Number(expected)) return -1;
    db.set(key, json);
    return current + 1;
  }
  throw new Error(`unexpected command ${name}`);
}

const saved = () => JSON.parse(db.get("offshift:state")!) as { version: number; client: string | null; data: DataSlice };
const seed = (version: number, data: DataSlice, client: string | null = null) => db.set("offshift:state", JSON.stringify({ version, client, data }));

const state = await import("@/app/api/state/route");
const watch = await import("@/app/api/watch/route");
const put = (body: unknown) => state.PUT(new Request("http://x/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const post = (body: unknown) => watch.POST(new Request("http://x/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("the shared week in Redis", () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = "https://redis.example";
    process.env.KV_REST_API_TOKEN = "token";
    db.clear();
    commands = [];
    meanwhile = null;
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => Response.json({ result: redis(JSON.parse(String(init.body))) }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("keeps both edits when two devices save at the same moment", async () => {
    const base = week();
    seed(1, base);
    const run = { id: "p-run", date: "2026-10-21", start: "07:00", end: "08:00", title: "Run", category: "personal" as const, importance: "flexible" as const };
    const fromPhone = { ...base, personal: [...base.personal, run] };
    const fromIpad = { ...base, uni: base.uni.filter((u) => u.id !== "u-due") };
    meanwhile = () => seed(2, fromIpad, "ipad");
    const j = await (await put({ data: fromPhone, base, baseVersion: 1, client: "phone" })).json();
    expect(j.version).toBe(3);
    expect(saved().version).toBe(3);
    expect(saved().data.personal.map((p) => p.id)).toContain("p-run");
    expect(saved().data.uni.map((u) => u.id)).not.toContain("u-due");
  });

  it("an answer from the watch survives a device saving at the same moment", async () => {
    seed(1, week());
    meanwhile = () => seed(2, { ...week(), personal: [] }, "ipad");
    const res = await post({ answer: { offerId: "o-thu", decision: "decline" } });
    expect(res.status).toBe(200);
    expect((await res.json()).v).toBe(3);
    expect(saved().data.offers[0].status).toBe("declined");
    expect(saved().data.personal).toEqual([]);
  });

  it("answers a poll with a single Redis command", async () => {
    seed(4, week());
    const j = await (await state.GET(new Request("http://x/api/state?since=4"))).json();
    expect(j).toMatchObject({ version: 4, storage: "redis" });
    expect(commands).toEqual(["MGET"]);
  });

  it("gives up after a few lost races instead of looping forever", async () => {
    let attempts = 0;
    await expect(
      retrying(async () => {
        attempts++;
        throw new StaleWrite();
      }),
    ).rejects.toBeInstanceOf(StaleWrite);
    expect(attempts).toBe(6);
  });
});
