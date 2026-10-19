import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

process.env.OFFSHIFT_STATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "offshift-")), "state.json");
const { GET, POST } = await import("@/app/api/watch/route");

const post = (body: unknown) => POST(new Request("http://x/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("/api/watch", () => {
  beforeEach(() => {
    (globalThis as { __offshiftState?: unknown }).__offshiftState = { version: 0, client: null, data: null };
  });
  it("serves the seed scenario before any device has synced", async () => {
    const j = await (await GET()).json();
    expect(j.ask.from).toBe("Jess");
  });
  it("applies an answer and bumps the shared version so the calendar picks it up", async () => {
    const res = await post({ answer: { offerId: "o-jess-thu", decision: "decline" } });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.ask).toBeNull();
    expect(j.v).toBe(1);
    expect(j.toast).toContain("Jess");
  });
  it("rejects answers it doesn't understand", async () => {
    expect((await post({ answer: { offerId: "o-jess-thu", decision: "maybe" } })).status).toBe(400);
    expect((await post({ answer: { offerId: "missing", decision: "accept" } })).status).toBe(404);
  });
  it("records a body reading", async () => {
    const j = await (await post({ body: { level: 3 } })).json();
    expect(j.v).toBe(1);
    const state = (globalThis as { __offshiftState?: { data: { wearable: { word: string } } } }).__offshiftState!;
    expect(state.data.wearable.word).toBe("Plenty of energy");
  });
  it("records a full health reading as words", async () => {
    const res = await post({ health: { energy: 1, sleep: 1, stress: 2, heart: null, at: "21:02" } });
    expect(res.status).toBe(200);
    expect((await res.json()).ask.from).toBe("Jess");
    const state = (globalThis as { __offshiftState?: { data: { wearable: unknown } } }).__offshiftState!;
    expect(state.data.wearable).toMatchObject({ word: "Running low", at: "21:02", signals: { energy: 1, sleep: 1, stress: 2 } });
  });
  it("clears the reading when the watch stops sharing", async () => {
    await post({ health: { energy: 1 } });
    expect((await post({ health: { share: false } })).status).toBe(200);
    const state = (globalThis as { __offshiftState?: { data: { wearable: unknown } } }).__offshiftState!;
    expect(state.data.wearable).toBeNull();
  });
  it("rejects a health reading it can't use", async () => {
    expect((await post({ health: { mood: 3 } })).status).toBe(400);
  });
});
