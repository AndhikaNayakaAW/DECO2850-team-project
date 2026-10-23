import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { useStore } from "@/lib/store";

const src = path.resolve(import.meta.dirname, "../..");

/** Every source file Offshift ships, without its tests. */
function shipped(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : shipped(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

describe("nothing in Offshift sends the manager a message", () => {
  it("has no way to write a message from the worker", () => {
    expect(useStore.getState()).not.toHaveProperty("sendMessage");
    const writers = shipped(src).filter((f) => /from:\s*"worker"/.test(readFileSync(f, "utf8")));
    expect(writers.map((f) => path.relative(src, f))).toEqual([]);
  });

  it("never offers to send a request from immersive mode", () => {
    const immersive = readFileSync(path.join(src, "components/board/Immersive.tsx"), "utf8");
    expect(immersive).not.toMatch(/Send request|Request sent|send your manager/);
  });
});
