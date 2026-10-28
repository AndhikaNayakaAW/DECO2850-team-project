import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = path.resolve(import.meta.dirname, "../..");
const root = path.resolve(src, "..");

/** Every source file Offshift ships, without its tests. */
function shipped(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : shipped(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

describe("the calendar has no immersive mode", () => {
  it("has no immersive view, hand tracking or MediaPipe models", () => {
    expect(existsSync(path.join(src, "components/board/Immersive.tsx"))).toBe(false);
    expect(existsSync(path.join(src, "lib/hands.ts"))).toBe(false);
    expect(existsSync(path.join(src, "lib/gestures.ts"))).toBe(false);
    expect(existsSync(path.join(root, "public/mediapipe"))).toBe(false);
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    expect({ ...pkg.dependencies, ...pkg.devDependencies }).not.toHaveProperty("@mediapipe/tasks-vision");
  });

  it("never mentions an immersive mode in the shipped code", () => {
    const left = shipped(src).filter((f) => /immersive|mediapipe|hand tracking/i.test(readFileSync(f, "utf8")));
    expect(left.map((f) => path.relative(src, f))).toEqual([]);
  });

  it("moves a plan by dragging it on the ordinary calendar, to a new day and time, with Undo", () => {
    const board = readFileSync(path.join(src, "components/board/CalendarBoard.tsx"), "utf8");
    expect(board).toMatch(/onPreviewEnd=/);
    expect(board).toMatch(/slotFacts\(/);
  });
});
