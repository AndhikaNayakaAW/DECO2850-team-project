import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { week } from "./fixture";

const file = path.join(mkdtempSync(path.join(tmpdir(), "offshift-file-")), "state.json");
process.env.OFFSHIFT_STATE_FILE = file;
const g = globalThis as unknown as { __offshiftState?: unknown; __offshiftLoading?: unknown };

async function fresh() {
  g.__offshiftState = undefined;
  g.__offshiftLoading = undefined;
  return import("@/lib/server-state");
}

describe("the week kept in a file", () => {
  it("reads a file it can't parse as unreadable, not as no week, so nothing quietly starts over it", async () => {
    writeFileSync(file, '{"version":7,"client":"x","data":{"schema":2,"shi');
    const { loadState, unreadable, noWeek } = await fresh();
    const s = await loadState();
    expect(unreadable(s)).toBe(true);
    expect(noWeek(s)).toBe(true);
  });

  it("is written whole, and read back the same", async () => {
    const { loadState, saveState } = await fresh();
    writeFileSync(file, JSON.stringify({ version: 1, client: null, data: week() }));
    g.__offshiftState = undefined;
    g.__offshiftLoading = undefined;
    const s = await loadState();
    await saveState(s, { ...week(), personal: [] }, "ipad");
    await new Promise((r) => setTimeout(r, 50));
    const back = JSON.parse(readFileSync(file, "utf8"));
    expect(back.version).toBe(2);
    expect(back.data.personal).toEqual([]);
  });

  it("shares one read of the file between requests that arrive together", async () => {
    writeFileSync(file, JSON.stringify({ version: 3, client: null, data: week() }));
    const { loadState } = await fresh();
    const [a, b] = await Promise.all([loadState(), loadState()]);
    expect(a).toBe(b);
  });
});
