/**
 * Turns per-frame hand features into a small set of deliberate gesture events.
 * Pure and frame-rate independent, so it can be driven by MediaPipe or by tests.
 */
export interface HandInfo {
  handedness: "Left" | "Right";
  open: boolean; // four fingers extended
  closed: boolean; // fingers curled
  pinch: boolean; // thumb tip near index tip
  palmFacing: boolean; // palm turned to the camera
  center: { x: number; y: number }; // 0..1, already mirrored so it matches the screen
  index: { x: number; y: number }; // index fingertip, 0..1 mirrored
  pinchPoint: { x: number; y: number }; // midpoint of thumb and index tips
  size: number; // wrist to middle-finger-base distance, 0..1
  fingers?: number; // extended fingers, thumb excluded (0..4)
  thumb?: "up" | "down" | null; // thumbs up or down with the other fingers curled
}

export interface FaceBox {
  x: number; // 0..1, mirrored like the hands
  y: number;
  w: number;
  h: number;
}

export interface HandFrame {
  t: number; // ms
  hands: HandInfo[];
  /** Someone is in front of the camera. Presence only: no identity, no expression. */
  face?: FaceBox | null;
}

export type GestureEvent =
  | { type: "explode" }
  | { type: "combine" }
  | { type: "zoom"; value: number } // absolute target 0..1 (0 = whole week, 1 = close)
  | { type: "orbit"; dTheta: number; dPhi: number }
  | { type: "cursor"; x: number; y: number; visible: boolean; pinching: boolean }
  | { type: "pinchStart"; x: number; y: number }
  | { type: "pinchMove"; x: number; y: number }
  | { type: "pinchHold"; x: number; y: number }
  | { type: "pinchEnd"; x: number; y: number; moved: boolean; held: boolean }
  | { type: "palmHold"; x: number; y: number }
  | { type: "thumbs"; dir: "up" | "down" }
  | { type: "fistHold" }
  | { type: "fingers"; count: number }
  | { type: "hands"; count: number };

export interface GestureOptions {
  openHoldMs?: number; // both palms stable before exploding
  closeHoldMs?: number; // both hands closed before combining
  pinchHoldMs?: number; // stationary pinch before "hold"
  palmHoldMs?: number; // one still open palm before "palmHold"
  thumbHoldMs?: number; // thumbs up or down held before it counts
  fistHoldMs?: number; // one fist held before "fistHold"
  fingerHoldMs?: number; // a finger count held before "fingers"
  smoothing?: number; // EMA factor 0..1 (higher = snappier)
}

interface Pt {
  x: number;
  y: number;
}

function ema(prev: Pt | null, next: Pt, a: number): Pt {
  // a hand cannot teleport: a big jump means tracking re-acquired, so snap instead of gliding
  if (!prev || Math.hypot(next.x - prev.x, next.y - prev.y) > 0.12) return { ...next };
  return { x: prev.x + (next.x - prev.x) * a, y: prev.y + (next.y - prev.y) * a };
}
function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class GestureEngine {
  private o: Required<GestureOptions>;
  private openSince = 0;
  private closedSince = 0;
  private exploded = false;
  private twoRef: { mid: Pt; dist: number; zoom: number } | null = null;
  private zoom = 0.25;
  private cursor: Pt | null = null;
  private pinchFrames = 0;
  private releaseFrames = 0;
  private pinching = false;
  private pinchStart: Pt | null = null;
  private pinchAnchor: Pt | null = null;
  private pinchAnchorT = 0;
  private pinchMoved = false;
  private pinchHeld = false;
  private palmAnchor: Pt | null = null;
  private palmAnchorT = 0;
  private palmFired = false;
  private lastCount = -1;
  private thumbSince = 0;
  private thumbDir: "up" | "down" | null = null;
  private thumbFired = false;
  private fistSince = 0;
  private fistFired = false;
  private fingerSince = 0;
  private fingerCount = 0;
  private fingerFired = false;
  /** "choose": raised fingers pick an option and the open-palm hold is off. */
  mode: "normal" | "choose" = "normal";

  constructor(opts: GestureOptions = {}) {
    this.o = { openHoldMs: 500, closeHoldMs: 500, pinchHoldMs: 1000, palmHoldMs: 1000, thumbHoldMs: 600, fistHoldMs: 1000, fingerHoldMs: 800, smoothing: 0.35, ...opts };
  }

  get isExploded() {
    return this.exploded;
  }
  get zoomValue() {
    return this.zoom;
  }
  setZoom(v: number) {
    this.zoom = Math.max(0, Math.min(1, v));
  }
  setExploded(v: boolean) {
    this.exploded = v;
  }

  update(frame: HandFrame): GestureEvent[] {
    const out: GestureEvent[] = [];
    const hands = frame.hands;
    const t = frame.t;
    if (hands.length !== this.lastCount) {
      this.lastCount = hands.length;
      out.push({ type: "hands", count: hands.length });
    }

    /* ---- two hands: explode / combine, zoom, orbit ---- */
    if (hands.length >= 2) {
      const [a, b] = hands;
      const bothOpen = a.open && b.open && a.palmFacing && b.palmFacing && !a.pinch && !b.pinch;
      const bothClosed = a.closed && b.closed;
      if (bothOpen) {
        if (!this.openSince) this.openSince = t;
        if (!this.exploded && t - this.openSince >= this.o.openHoldMs) {
          this.exploded = true;
          out.push({ type: "explode" });
        }
      } else this.openSince = 0;
      if (bothClosed) {
        if (!this.closedSince) this.closedSince = t;
        if (this.exploded && t - this.closedSince >= this.o.closeHoldMs) {
          this.exploded = false;
          out.push({ type: "combine" });
        }
      } else this.closedSince = 0;

      // zoom + orbit from the pair, only while neither hand is pinching
      if (!a.pinch && !b.pinch) {
        const mid = { x: (a.center.x + b.center.x) / 2, y: (a.center.y + b.center.y) / 2 };
        const d = dist(a.center, b.center);
        if (!this.twoRef) this.twoRef = { mid, dist: d, zoom: this.zoom };
        else {
          const sm = ema(this.twoRef.mid, mid, this.o.smoothing);
          const dx = sm.x - this.twoRef.mid.x;
          const dy = sm.y - this.twoRef.mid.y;
          if (Math.abs(dx) > 0.004 || Math.abs(dy) > 0.004) out.push({ type: "orbit", dTheta: dx * 3.2, dPhi: dy * 1.6 });
          this.twoRef.mid = sm;
          const ratio = d / Math.max(0.05, this.twoRef.dist);
          const target = Math.max(0, Math.min(1, this.twoRef.zoom + (ratio - 1) * 0.9));
          if (Math.abs(target - this.zoom) > 0.005) {
            this.zoom += (target - this.zoom) * this.o.smoothing;
            out.push({ type: "zoom", value: this.zoom });
          }
        }
      } else this.twoRef = null;
    } else {
      this.openSince = 0;
      this.closedSince = 0;
      this.twoRef = null;
    }

    /* ---- one hand: cursor, pinch, palm hold ---- */
    const h = hands.length === 1 ? hands[0] : hands.length >= 2 ? hands.find((x) => x.pinch) || null : null;
    if (h) {
      const raw = h.pinch || this.pinching ? h.pinchPoint : h.index;
      this.cursor = ema(this.cursor, raw, this.o.smoothing);
      const c = this.cursor;
      // pinch with hysteresis: 3 frames to start, 4 to end
      if (h.pinch) {
        this.pinchFrames += 1;
        this.releaseFrames = 0;
      } else {
        this.releaseFrames += 1;
        this.pinchFrames = 0;
      }
      if (!this.pinching && this.pinchFrames >= 3) {
        this.pinching = true;
        this.pinchStart = { ...c };
        this.pinchAnchor = { ...c };
        this.pinchAnchorT = t;
        this.pinchMoved = false;
        this.pinchHeld = false;
        out.push({ type: "pinchStart", x: c.x, y: c.y });
      } else if (this.pinching && this.releaseFrames >= 4) {
        this.pinching = false;
        out.push({ type: "pinchEnd", x: c.x, y: c.y, moved: this.pinchMoved, held: this.pinchHeld });
        this.pinchStart = null;
      } else if (this.pinching && this.pinchStart) {
        if (!this.pinchMoved && dist(c, this.pinchStart) > 0.03) this.pinchMoved = true;
        if (this.pinchMoved) out.push({ type: "pinchMove", x: c.x, y: c.y });
        if (this.pinchAnchor && dist(c, this.pinchAnchor) > 0.02) {
          this.pinchAnchor = { ...c };
          this.pinchAnchorT = t;
        } else if (!this.pinchHeld && !this.pinchMoved && t - this.pinchAnchorT >= this.o.pinchHoldMs) {
          this.pinchHeld = true;
          out.push({ type: "pinchHold", x: c.x, y: c.y });
        }
      }
      // thumbs up / down, held
      if (hands.length === 1 && h.thumb) {
        if (this.thumbDir !== h.thumb) {
          this.thumbDir = h.thumb;
          this.thumbSince = t;
          this.thumbFired = false;
        } else if (!this.thumbFired && t - this.thumbSince >= this.o.thumbHoldMs) {
          this.thumbFired = true;
          out.push({ type: "thumbs", dir: h.thumb });
        }
      } else {
        this.thumbDir = null;
        this.thumbFired = false;
      }
      // one fist held (undo)
      if (hands.length === 1 && h.closed && !h.thumb) {
        if (!this.fistSince) this.fistSince = t;
        else if (!this.fistFired && t - this.fistSince >= this.o.fistHoldMs) {
          this.fistFired = true;
          out.push({ type: "fistHold" });
        }
      } else {
        this.fistSince = 0;
        this.fistFired = false;
      }
      // raised fingers choose an option
      const fc = h.fingers ?? (h.open ? 4 : 0);
      if (hands.length === 1 && this.mode === "choose" && !h.pinch && !h.thumb && fc >= 1 && fc <= 4) {
        if (this.fingerCount !== fc) {
          this.fingerCount = fc;
          this.fingerSince = t;
          this.fingerFired = false;
        } else if (!this.fingerFired && t - this.fingerSince >= this.o.fingerHoldMs) {
          this.fingerFired = true;
          out.push({ type: "fingers", count: fc });
        }
      } else {
        this.fingerCount = 0;
        this.fingerFired = false;
      }
      // one open palm held still
      if (hands.length === 1 && this.mode === "normal" && h.open && h.palmFacing && !h.pinch) {
        if (!this.palmAnchor || dist(c, this.palmAnchor) > 0.035) {
          this.palmAnchor = { ...c };
          this.palmAnchorT = t;
          this.palmFired = false;
        } else if (!this.palmFired && t - this.palmAnchorT >= this.o.palmHoldMs) {
          this.palmFired = true;
          out.push({ type: "palmHold", x: c.x, y: c.y });
        }
      } else {
        this.palmAnchor = null;
        this.palmFired = false;
      }
      out.push({ type: "cursor", x: c.x, y: c.y, visible: true, pinching: this.pinching });
    } else {
      if (this.pinching) {
        this.pinching = false;
        const c = this.cursor || { x: 0.5, y: 0.5 };
        out.push({ type: "pinchEnd", x: c.x, y: c.y, moved: this.pinchMoved, held: this.pinchHeld });
      }
      this.pinchFrames = 0;
      this.releaseFrames = 0;
      this.palmAnchor = null;
      this.palmFired = false;
      this.thumbDir = null;
      this.thumbFired = false;
      this.fistSince = 0;
      this.fistFired = false;
      this.fingerCount = 0;
      this.fingerFired = false;
      if (this.cursor) out.push({ type: "cursor", x: this.cursor.x, y: this.cursor.y, visible: false, pinching: false });
      this.cursor = null;
    }
    return out;
  }
}
