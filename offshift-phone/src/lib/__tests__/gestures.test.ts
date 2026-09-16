import { describe, expect, it } from "vitest";
import { GestureEngine, type GestureEvent, type HandInfo } from "@/lib/gestures";

const hand = (o: Partial<HandInfo> = {}): HandInfo => ({ handedness: "Right", open: false, closed: false, pinch: false, palmFacing: true, center: { x: 0.5, y: 0.5 }, index: { x: 0.5, y: 0.5 }, pinchPoint: { x: 0.5, y: 0.5 }, size: 0.15, fingers: 0, thumb: null, ...o });
const at = (x: number, y: number, o: Partial<HandInfo> = {}) => hand({ index: { x, y }, pinchPoint: { x, y }, center: { x, y: y + 0.1 }, ...o });

function run(engine: GestureEngine, hands: HandInfo[], ms: number, step = 40, from = 0): GestureEvent[] {
  const out: GestureEvent[] = [];
  for (let t = from; t < from + ms; t += step) out.push(...engine.update({ t, hands }));
  return out;
}
const types = (evs: GestureEvent[]) => evs.map((e) => e.type);

describe("two-hand gestures", () => {
  it("explodes only after both palms are stable for half a second, and never repeats", () => {
    const e = new GestureEngine();
    const palms = [hand({ handedness: "Left", open: true, center: { x: 0.35, y: 0.5 } }), hand({ open: true, center: { x: 0.65, y: 0.5 } })];
    expect(types(run(e, palms, 400))).not.toContain("explode");
    expect(types(run(e, palms, 400, 40, 400))).toContain("explode");
    expect(types(run(e, palms, 1000, 40, 800)).filter((t) => t === "explode")).toHaveLength(0);
  });
  it("combines after both hands close", () => {
    const e = new GestureEngine();
    e.setExploded(true);
    const fists = [hand({ handedness: "Left", closed: true, center: { x: 0.4, y: 0.5 } }), hand({ closed: true, center: { x: 0.6, y: 0.5 } })];
    expect(types(run(e, fists, 700))).toContain("combine");
    expect(e.isExploded).toBe(false);
  });
  it("zooms in as the hands move apart", () => {
    const e = new GestureEngine();
    let z = e.zoomValue;
    for (let i = 0; i < 12; i++) {
      const d = 0.3 + i * 0.03;
      run(e, [hand({ handedness: "Left", open: true, center: { x: 0.5 - d / 2, y: 0.5 } }), hand({ open: true, center: { x: 0.5 + d / 2, y: 0.5 } })], 40, 40, i * 40);
    }
    expect(e.zoomValue).toBeGreaterThan(z);
  });
});

describe("one-hand gestures", () => {
  it("reports a pinch and its release without movement as a tap", () => {
    const e = new GestureEngine();
    run(e, [at(0.4, 0.4)], 200);
    const start = run(e, [at(0.4, 0.4, { pinch: true })], 200, 40, 200);
    expect(types(start)).toContain("pinchStart");
    const end = run(e, [at(0.4, 0.4)], 200, 40, 400);
    const pe = end.find((x) => x.type === "pinchEnd");
    expect(pe && pe.type === "pinchEnd" && pe.moved).toBe(false);
  });
  it("fires pinchHold after a stationary second and pinchMove when the hand travels", () => {
    const e = new GestureEngine();
    expect(types(run(e, [at(0.4, 0.4, { pinch: true })], 1200))).toContain("pinchHold");
    const e2 = new GestureEngine();
    run(e2, [at(0.4, 0.4, { pinch: true })], 200);
    const moves = run(e2, [at(0.6, 0.4, { pinch: true })], 200, 40, 200);
    expect(types(moves)).toContain("pinchMove");
  });
  it("needs a held thumb before confirming, then latches", () => {
    const e = new GestureEngine();
    expect(types(run(e, [hand({ thumb: "up" })], 400))).not.toContain("thumbs");
    expect(types(run(e, [hand({ thumb: "up" })], 400, 40, 400))).toContain("thumbs");
    expect(types(run(e, [hand({ thumb: "up" })], 800, 40, 800))).not.toContain("thumbs");
  });
  it("undoes on a held fist and picks options by raised fingers only in choose mode", () => {
    const e = new GestureEngine();
    expect(types(run(e, [hand({ closed: true })], 1200))).toContain("fistHold");
    const e2 = new GestureEngine();
    expect(types(run(e2, [hand({ open: true, fingers: 3 })], 1000))).not.toContain("fingers");
    e2.mode = "choose";
    const evs = run(e2, [hand({ open: true, fingers: 3 })], 1000, 40, 1000);
    const f = evs.find((x) => x.type === "fingers");
    expect(f && f.type === "fingers" && f.count).toBe(3);
  });
  it("snaps the cursor instead of gliding when tracking re-acquires far away", () => {
    const e = new GestureEngine();
    run(e, [at(0.1, 0.1)], 200);
    const evs = run(e, [at(0.8, 0.8)], 40, 40, 200);
    const c = evs.find((x) => x.type === "cursor");
    expect(c && c.type === "cursor" && Math.abs(c.x - 0.8) < 0.01).toBe(true);
  });
});
