import { describe, expect, it } from "vitest";
import { landmarksToHand } from "@/lib/hands";

/** A synthetic right hand in image space: wrist at the bottom, fingers pointing up. */
function makeHand(opts: { curl?: number[]; thumbY?: number; thumbX?: number; pinch?: boolean } = {}) {
  const wrist = { x: 0.5, y: 0.8, z: 0 };
  const lm = Array.from({ length: 21 }, () => ({ ...wrist }));
  const bases = [5, 9, 13, 17];
  const xs = [0.56, 0.52, 0.48, 0.44];
  bases.forEach((b, i) => {
    lm[b] = { x: xs[i], y: 0.62, z: 0 };
    const curled = opts.curl?.includes(i);
    lm[b + 1] = { x: xs[i], y: 0.55, z: 0 };
    lm[b + 2] = { x: xs[i], y: curled ? 0.6 : 0.48, z: 0 };
    lm[b + 3] = { x: xs[i], y: curled ? 0.66 : 0.4, z: 0 };
  });
  lm[2] = { x: 0.6, y: 0.72, z: 0 };
  lm[4] = { x: opts.thumbX ?? 0.66, y: opts.thumbY ?? 0.6, z: 0 };
  if (opts.pinch) lm[4] = { ...lm[8], x: lm[8].x + 0.01 };
  return lm;
}

describe("hand features from landmarks", () => {
  it("sees an open palm facing the camera", () => {
    const h = landmarksToHand(makeHand(), "Right");
    expect(h.open).toBe(true);
    expect(h.closed).toBe(false);
    expect(h.fingers).toBe(4);
    expect(h.palmFacing).toBe(true);
  });
  it("sees a fist", () => {
    const h = landmarksToHand(makeHand({ curl: [0, 1, 2, 3], thumbX: 0.5, thumbY: 0.66 }), "Right");
    expect(h.closed).toBe(true);
    expect(h.thumb).toBeNull();
  });
  it("sees a pinch between thumb and index", () => {
    expect(landmarksToHand(makeHand({ pinch: true }), "Right").pinch).toBe(true);
  });
  it("reads thumbs up and thumbs down from a fist with the thumb out", () => {
    expect(landmarksToHand(makeHand({ curl: [0, 1, 2, 3], thumbX: 0.66, thumbY: 0.55 }), "Right").thumb).toBe("up");
    expect(landmarksToHand(makeHand({ curl: [0, 1, 2, 3], thumbX: 0.66, thumbY: 0.9 }), "Right").thumb).toBe("down");
  });
  it("mirrors x so the hand matches the screen", () => {
    const h = landmarksToHand(makeHand(), "Right");
    expect(h.index.x).toBeCloseTo(1 - 0.56, 5);
  });
});
