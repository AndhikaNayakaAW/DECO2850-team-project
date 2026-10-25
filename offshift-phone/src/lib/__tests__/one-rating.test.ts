import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bodyCheck } from "@/lib/checks";
import { useStore } from "@/lib/store";
import { cleanData } from "@/lib/validate";
import { NOW, ask, week } from "./fixture";

const source = (file: string) => readFileSync(path.join(process.cwd(), "src", file), "utf8");

/** One question after a shift, the watch's: how was the work. The old Fine, Tired, Wiped body rating asked a second time. */
describe("a shift has one rating", () => {
  it("asks only how the work was, never how the body felt", () => {
    expect(source("components/board/ItemForm.tsx")).not.toMatch(/How did it feel|"fine"|"tired"|"wiped"|Wiped/);
    expect("rateShift" in useStore.getState()).toBe(false);
  });

  it("drops an old Fine, Tired or Wiped rating from a saved week, and keeps the shift", () => {
    const old = { ...week(), shifts: [{ ...week().shifts[0], rated: "tired" }] };
    const clean = cleanData(old)!;
    expect(clean.shifts).toHaveLength(1);
    expect("rated" in clean.shifts[0]).toBe(false);
  });

  it("reads the work rating in the ask's Body check", () => {
    expect(bodyCheck(ask(), week(), NOW).text).toMatch(/^You rated Tuesday's late finish Hard\. /);
    const light = { ...week(), shifts: week().shifts.map((s) => (s.id === "s-tue" ? { ...s, effort: "light" as const } : s)) };
    expect(bodyCheck(ask(), light, NOW).text).not.toMatch(/rated/);
  });
});
