import { describe, expect, it } from "vitest";
import { throwSpeed } from "@/lib/flick";

describe("throwing a block", () => {
  it("is a throw only when the pointer is still moving fast as it lets go", () => {
    const fast = [0, 16, 33, 50, 66].map((t, i) => ({ x: i * 40, y: 0, t: 1000 + t }));
    expect(throwSpeed(fast, 1070)).toBeGreaterThan(1.4);
    // the same quick drag, then a half-second pause before letting go: a drop
    expect(throwSpeed(fast, 1570)).toBe(0);
    // a slow drag
    const slow = [0, 50, 100].map((t, i) => ({ x: i * 10, y: 0, t: 1000 + t }));
    expect(throwSpeed(slow, 1105)).toBeLessThan(1.4);
  });
});
