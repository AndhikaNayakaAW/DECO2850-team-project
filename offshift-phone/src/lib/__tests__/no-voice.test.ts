import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = path.resolve(import.meta.dirname, "../..");

/** Every source file Offshift ships, without its tests. */
function shipped(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : shipped(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

describe("Offshift never speaks or listens", () => {
  it("has no voice assistant, and no Claude behind it", () => {
    expect(existsSync(path.join(src, "app/api/assistant"))).toBe(false);
    expect(existsSync(path.join(src, "components/board/Assistant.tsx"))).toBe(false);
    const pkg = JSON.parse(readFileSync(path.join(src, "../package.json"), "utf8"));
    expect({ ...pkg.dependencies, ...pkg.devDependencies }).not.toHaveProperty("@anthropic-ai/sdk");
  });

  it("never uses speech output or the microphone, in the calendar or in immersive mode", () => {
    const voice = shipped(src).filter((f) => /speechSynthesis|SpeechRecognition|@\/lib\/speech|@\/lib\/assistant/.test(readFileSync(f, "utf8")));
    expect(voice.map((f) => path.relative(src, f))).toEqual([]);
  });
});
