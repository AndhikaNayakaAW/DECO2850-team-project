"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DAYS, fromMinutes, minutes } from "@/lib/logic";
import type { Day, DayItem, DayView } from "@/lib/types";

const H0 = 6;
const H1 = 24;
const UNIT = 0.25;
const SPACING = 1.36;
const LIFT = 0.55;
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 2.1;
const HOLO = 0xdaab56;
const DANGER = 0xe59981;

type MatKey = "uni" | "shift" | "mcd" | "offer" | "personal" | "rest" | "travel" | "boundary";
type BaseKey = "base" | "baseRest" | "baseToday" | "baseSel";

export interface SlotTarget {
  day: Day;
  start: string;
  end: string;
}

/** What the immersive view drives on the scene. */
export interface SceneHandle {
  setExploded: (v: boolean) => void;
  isExploded: () => boolean;
  setSelectedItem: (id: string | null) => void;
  hitAt: (nx: number, ny: number) => { itemId?: string; day?: Day; time?: string } | null;
  startPreview: (itemId: string) => boolean;
  movePreview: (nx: number, ny: number) => SlotTarget | null;
  endPreview: () => SlotTarget | null;
  clearPreview: () => void;
  showCreateGhost: (nx: number, ny: number, durationMin: number) => SlotTarget | null;
  clearCreateGhost: () => void;
  setZoomLevel: (v01: number) => void;
  zoomBy: (factor: number) => void;
  nudgeOrbit: (dTheta: number, dPhi: number) => void;
  resetView: () => void;
  hoverAt: (nx: number, ny: number, visible: boolean) => void;
}

export interface DropTarget {
  item: DayItem;
  from: Day;
}

interface Block {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  day: DayView;
  s: number;
  e: number;
  label: string;
  offerId?: string;
  item?: DayItem;
  delay: number;
  offer?: boolean;
  rest?: boolean;
  home: THREE.Vector3;
  layer: THREE.Vector3;
  tag?: HTMLElement;
  kind: DayItem["kind"];
}

interface Grab {
  block: Block;
  plane: THREE.Plane;
  offset: THREE.Vector3;
  moved: boolean;
  targetDay: number;
  remove: boolean;
  samples: { x: number; y: number; t: number }[];
  edges: THREE.LineSegments;
  savedEmissive: THREE.Color;
  savedOpacity: number;
  savedTransparent: boolean;
}

interface Fx {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  v: THREE.Vector3;
  av: THREE.Vector3;
  t0: number;
}

function hours(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}
function fmt(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh < 10 ? "0" : ""}${hh}:${mm < 10 ? "0" : ""}${mm}`;
}
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

class WeekScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(18, 2, 0.1, 120);
  group = new THREE.Group();
  fxGroup = new THREE.Group();
  target = new THREE.Vector3(0, 1.8, 0);
  orbit = { theta: 0.4, phi: 1.2, r: 24 };
  baseTheta = 0.4;
  zoom = 1;
  pointers = new Map<number, { x: number; y: number }>();
  pinchDist = 0;
  pinchZoom = 1;
  hemi: THREE.HemisphereLight;
  mats: Partial<Record<MatKey | BaseKey, THREE.MeshStandardMaterial>> = {};
  bases: { mesh: THREE.Mesh; day: DayView }[] = [];
  selected: Day | null = null;
  guide!: THREE.MeshBasicMaterial;
  edge!: THREE.LineBasicMaterial;
  holoEdge = new THREE.LineBasicMaterial({ color: HOLO, transparent: true, opacity: 0.95 });
  ringMat = new THREE.MeshBasicMaterial({ color: HOLO, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  ring: THREE.Mesh;
  blocks: Block[] = [];
  fx: Fx[] = [];
  grab: Grab | null = null;
  returning: { block: Block; from: THREE.Vector3; t0: number }[] = [];
  dayLabels: { el: HTMLElement; pos: THREE.Vector3 }[] = [];
  hourLabels: { el: HTMLElement; pos: THREE.Vector3 }[] = [];
  ray = new THREE.Raycaster();
  ndc = new THREE.Vector2(-2, -2);
  pointer = { x: 0, y: 0 };
  hovered: Block | null = null;
  dragging = false;
  moved = false;
  last = { x: 0, y: 0 };
  lastInteract = -10;
  t0 = performance.now();
  started = 0;
  running = false;
  raf: number | null = null;
  lastFrame = 0;
  w = 1;
  h = 1;
  reduced = false;
  disposed = false;
  ro: ResizeObserver | null = null;
  mo: MutationObserver | null = null;
  tmp = new THREE.Vector3();
  editable = false;
  mode: "board" | "immersive" = "board";
  detail = false;
  exploded = false;
  selectedId: string | null = null;
  selEdges: THREE.LineSegments | null = null;
  thetaTarget = 0.4;
  phiTarget = 1.2;
  zoomTarget = 1;
  preview: { block: Block; ghost: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; target: SlotTarget | null; durationMin: number } | null = null;
  createGhost: { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; target: SlotTarget | null } | null = null;
  connectors: THREE.Line[] = [];
  dashMat = new THREE.LineDashedMaterial({ color: 0x647c5f, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.7 });
  slowFrames = 0;
  onSelect: ((id: string | null) => void) | null = null;
  onPreviewEnd: ((t: SlotTarget, itemId: string) => void) | null = null;
  mouseDrag: { block: Block; moved: boolean } | null = null;

  constructor(
    public stage: HTMLElement,
    public canvas: HTMLCanvasElement,
    public labels: HTMLElement,
    public tip: HTMLElement,
    public bin: HTMLElement | null,
    public onTap: (offerId: string) => void,
    public onDayTap: (day: Day) => void,
    public onRemove: (t: DropTarget) => void,
    public onMoveItem: (t: DropTarget, to: Day) => void,
  ) {
    try {
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {}
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a88a8, 2.2);
    this.scene.add(this.hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(5, 9, 7);
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-6, 4, -4);
    this.scene.add(fill);
    this.scene.add(this.group);
    this.scene.add(this.fxGroup);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 48), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.scene.add(this.ring);
    this.makeMats();
    this.bind();
    this.resize();
    this.placeCamera();
  }

  now() {
    return (performance.now() - this.t0) / 1000;
  }

  makeMats() {
    const c = (name: string, fallback: string) => new THREE.Color(cssVar(name) || fallback);
    const std = (key: keyof WeekScene["mats"], opts: THREE.MeshStandardMaterialParameters) => {
      if (!this.mats[key]) this.mats[key] = new THREE.MeshStandardMaterial(opts);
      return this.mats[key]!;
    };
    std("uni", { roughness: 0.8, metalness: 0 }).color.copy(c("--uni3d", "#7A78A0"));
    std("shift", { roughness: 0.7, metalness: 0 }).color.copy(c("--accent", "#454283"));
    std("mcd", { roughness: 0.7, metalness: 0 }).color.copy(c("--mcd3d", "#2E6F8E"));
    std("personal", { roughness: 0.75, metalness: 0 }).color.copy(c("--personal3d", "#8A3F6E"));
    const travel = std("travel", { roughness: 0.9, metalness: 0, transparent: true, opacity: 0.45 });
    travel.color.copy(c("--line", "#DCDACF"));
    const boundary = std("boundary", { roughness: 1, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false });
    boundary.color.copy(c("--lamp", "#DAAB56"));
    const offer = std("offer", { roughness: 0.5, metalness: 0, transparent: true, opacity: 0.92 });
    offer.color.copy(c("--lamp", "#B8801A"));
    offer.emissive.copy(c("--lamp", "#B8801A"));
    offer.emissiveIntensity = 0.3;
    const rest = std("rest", { roughness: 0.9, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false });
    rest.color.copy(c("--ok", "#2F7A4B"));
    rest.emissive.copy(c("--ok", "#2F7A4B"));
    rest.emissiveIntensity = 0.15;
    std("base", { roughness: 1, metalness: 0 }).color.copy(c("--surface-2", "#F6F7FA"));
    std("baseRest", { roughness: 1, metalness: 0 }).color.copy(c("--ok", "#2F7A4B")).lerp(c("--surface-2", "#F6F7FA"), 0.55);
    std("baseToday", { roughness: 1, metalness: 0 }).color.copy(c("--accent-soft", "#E4E3F5"));
    const sel = std("baseSel", { roughness: 0.8, metalness: 0 });
    sel.color.copy(c("--accent", "#454283"));
    sel.emissive.copy(c("--accent", "#454283"));
    sel.emissiveIntensity = 0.25;
    if (!this.guide) this.guide = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 });
    this.guide.color.copy(c("--line", "#D9DBE6"));
    if (!this.edge) this.edge = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
    this.edge.color.copy(c("--lamp", "#B8801A"));
    this.hemi.groundColor = c("--ground", "#EEF0F5");
    this.blocks.forEach((b) => {
      if (this.grab && this.grab.block === b) return;
      const key = (b.mesh.userData.key as MatKey) || "shift";
      const src = this.mats[key];
      if (src) {
        b.mesh.material.color.copy(src.color);
        b.mesh.material.emissive.copy(src.emissive);
      }
    });
  }

  yOf(h: number) {
    return (h - H0) * UNIT;
  }

  setDays(days: DayView[]) {
    this.endGrab(false);
    this.returning = [];
    // blocks that already stood keep standing; only new ones grow in
    const prev = new Set(this.blocks.map((b) => b.item?.id || (b.rest ? `rest-${b.day.day}` : "")));
    const known = (id: string) => prev.size > 0 && prev.has(id);
    this.group.children.slice().forEach((child) => {
      this.group.remove(child);
      child.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    });
    this.blocks = [];
    this.bases = [];
    this.connectors.forEach((l) => {
      this.scene.remove(l);
      l.geometry.dispose();
    });
    this.connectors = [];
    this.clearPreview();
    this.clearCreateGhost();
    this.selEdges = null;
    this.labels.innerHTML = "";
    this.dayLabels = [];
    this.hourLabels = [];
    this.hovered = null;
    this.tip.hidden = true;

    days.forEach((day, di) => {
      const x = (di - 3) * SPACING;
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.07, 1.12), this.baseMat(day));
      base.position.set(x, -0.035, 0);
      this.group.add(base);
      this.bases.push({ mesh: base, day });
      if (day.rest) {
        const g = new THREE.BoxGeometry(0.96, this.yOf(H1), 0.96);
        g.translate(0, this.yOf(H1) / 2, 0);
        const mesh = new THREE.Mesh(g, this.mats.rest!.clone());
        mesh.userData.key = "rest";
        mesh.position.set(x, 0, 0);
        this.group.add(mesh);
        const restItem: DayItem = { id: `rest-${day.day}`, kind: "rest", start: "06:00", end: "24:00", label: "Protected rest", source: "Offshift", status: "Boundary · booked like a shift" };
        const rb: Block = { mesh, day, s: H0, e: H1, label: "Protected rest · booked like a shift", item: restItem, delay: known(`rest-${day.day}`) ? -10 : di * 0.09, rest: true, home: mesh.position.clone(), layer: this.layerFor("rest"), kind: "rest" };
        this.blocks.push(rb);
        if (this.detail) this.makeLabel(rb);
      }
      let ii = 0;
      day.items.forEach((it) => {
        if (it.kind === "rest" || it.kind === "due") return;
        const s = Math.max(H0, hours(it.start));
        const e = Math.min(H1, hours(it.end));
        if (e <= s) return;
        const key: MatKey =
          it.kind === "shift" ? (it.employer === "mcd" ? "mcd" : "shift") : it.kind === "offer" ? "offer" : it.kind === "personal" ? (it.category === "study" ? "uni" : it.category === "rest" ? "rest" : "personal") : it.kind === "travel" ? "travel" : it.kind === "boundary" ? "boundary" : "uni";
        const h = (e - s) * UNIT;
        const slim = it.kind === "personal" || it.kind === "travel";
        const w = it.kind === "boundary" ? 1.06 : slim ? 0.72 : 0.92;
        const geo = new THREE.BoxGeometry(w, h, w);
        geo.translate(0, h / 2, 0);
        const m = this.mats[key]!.clone();
        const mesh = new THREE.Mesh(geo, m);
        mesh.userData.key = key;
        mesh.position.set(x + (slim ? 0.12 : 0), this.yOf(s), slim ? 0.14 : 0);
        this.group.add(mesh);
        const entry: Block = { mesh, day, s, e, label: `${it.label}${it.source ? ` · ${it.source}` : ""}`, offerId: it.offerId, item: it, delay: known(it.id) ? -10 : di * 0.09 + ii * 0.07, home: mesh.position.clone(), layer: this.layerFor(it.kind), kind: it.kind };
        if (it.kind === "offer") {
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.0, h + 0.06, 1.0)), this.edge);
          edges.position.set(0, h / 2, 0);
          mesh.add(edges);
          entry.offer = true;
          entry.label = `${it.label} · tap to open`;
        }
        this.blocks.push(entry);
        if (this.detail) this.makeLabel(entry);
        ii += 1;
      });
      const lab = document.createElement("div");
      lab.className = `dlab${day.today ? " today" : ""}`;
      lab.innerHTML = `<b>${day.day}</b>${day.date}`;
      this.labels.appendChild(lab);
      this.dayLabels.push({ el: lab, pos: new THREE.Vector3(x, -0.42, 0.6) });
    });
    const hourLines = this.detail ? [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] : [12, 18, 24];
    const hourText = this.detail ? [8, 10, 12, 14, 16, 18, 20, 22, 24] : [12, 18, 24];
    hourLines.forEach((h) => {
      const major = h % 6 === 0;
      const guide = new THREE.Mesh(new THREE.BoxGeometry(SPACING * 7 + 0.3, major ? 0.014 : 0.006, major ? 0.014 : 0.006), this.guide);
      guide.position.set(0, this.yOf(h), -0.64);
      this.group.add(guide);
      if (!hourText.includes(h)) return;
      const hl = document.createElement("div");
      hl.className = "hlab";
      hl.textContent = fmt(h);
      this.labels.appendChild(hl);
      this.hourLabels.push({ el: hl, pos: new THREE.Vector3(-SPACING * 3.5 - 0.2, this.yOf(h), -0.64) });
    });
    const hl0 = document.createElement("div");
    hl0.className = "hlab";
    hl0.textContent = fmt(H0);
    this.labels.appendChild(hl0);
    this.hourLabels.push({ el: hl0, pos: new THREE.Vector3(-SPACING * 3.5 - 0.2, 0, -0.64) });
    this.started = this.now();
    if (this.selectedId) this.setSelectedItem(this.selectedId);
    this.applyExploded(true);
    this.start();
  }

  /* ---------- exploded layers ---------- */

  layerFor(kind: DayItem["kind"]): THREE.Vector3 {
    switch (kind) {
      case "shift":
      case "travel":
        return new THREE.Vector3(0, 0, 1.3); // work comes forward
      case "offer":
        return new THREE.Vector3(0, 1.0, 1.3); // pending floats above confirmed work
      case "uni":
        return new THREE.Vector3(0, 1.5, 0); // study rises
      case "personal":
        return new THREE.Vector3(0, 0, -1.2); // plans step back to one side
      case "rest":
        return new THREE.Vector3(0.9, 0, -0.6); // rest on its own layer
      default:
        return new THREE.Vector3(0, 0, 0); // boundaries stay where they are
    }
  }

  setExploded(v: boolean) {
    if (this.exploded === v) return;
    this.exploded = v;
    this.applyExploded(false);
    this.lastInteract = this.now();
    this.start();
  }

  applyExploded(instant: boolean) {
    this.connectors.forEach((l) => {
      this.scene.remove(l);
      l.geometry.dispose();
    });
    this.connectors = [];
    if (this.exploded) {
      // travel connections: travel block ↔ the shift it belongs to, and ↔ the activity before it
      this.blocks
        .filter((b) => b.kind === "travel" && b.item)
        .forEach((tb) => {
          const forId = (tb.item as DayItem & { travelFor?: string }).travelFor;
          const shift = this.blocks.find((b) => b.item?.id === forId);
          const prev = this.blocks
            .filter((b) => b.day === tb.day && b !== tb && b.kind !== "travel" && b.kind !== "boundary" && b.kind !== "rest" && b.e <= tb.s + 0.01)
            .sort((a, b) => b.e - a.e)[0];
          const ends = [shift, prev].filter(Boolean) as Block[];
          ends.forEach((other) => {
            const a = tb.home.clone().add(tb.layer).add(new THREE.Vector3(0, ((tb.e - tb.s) * UNIT) / 2, 0));
            const c = other.home.clone().add(other.layer).add(new THREE.Vector3(0, ((other.e - other.s) * UNIT) / 2, 0));
            const geo = new THREE.BufferGeometry().setFromPoints([a, c]);
            const line = new THREE.Line(geo, this.dashMat);
            line.computeLineDistances();
            this.scene.add(line);
            this.connectors.push(line);
          });
        });
    }
    if (instant || this.reduced) {
      this.blocks.forEach((b) => {
        b.mesh.position.copy(b.home);
        if (this.exploded) b.mesh.position.add(b.layer);
      });
    }
  }

  /* ---------- labels ---------- */

  makeLabel(b: Block) {
    const it = b.item;
    if (!it) return;
    const el = document.createElement("div");
    el.className = `blab ${it.kind}${b.rest ? " rest" : ""}`;
    const cat = it.kind === "shift" ? "Work" : it.kind === "uni" ? "Uni" : it.kind === "offer" ? "Ask" : it.kind === "travel" ? "Travel" : it.kind === "boundary" ? "Boundary" : it.kind === "rest" ? "Rest" : it.category === "study" ? "Study" : it.category === "rest" ? "Rest" : it.category === "appointment" ? "Appointment" : "Personal";
    const time = b.rest ? "All day" : `${fmt(b.s)}–${fmt(b.e)}`;
    el.innerHTML = `<b>${it.label.replace(/ · (Pandora Team|McDonald's Crew|myUQ|Calendar|Offshift)$/, "")}</b><span>${time} · ${cat}</span>${it.status ? `<i>${it.status}</i>` : ""}`;
    this.labels.appendChild(el);
    b.tag = el;
  }

  /** Labels tier with zoom and never pile up: selected and offers win, then work, study and plans, then travel and boundaries. */
  placeBlockLabels() {
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const rank = (b: Block) => (b.item?.id === this.selectedId ? 0 : b === this.hovered ? 1 : b.kind === "offer" ? 2 : b.kind === "travel" || b.kind === "boundary" ? 5 : b.rest ? 4 : 3);
    const z = this.zoom;
    const order = this.blocks.filter((b) => b.tag).sort((a, b) => rank(a) - rank(b));
    for (const b of order) {
      const el = b.tag!;
      const top = b.mesh.position.clone();
      top.y += (b.e - b.s) * UNIT * b.mesh.scale.y + 0.08;
      this.tmp.copy(top).project(this.camera);
      const x = ((this.tmp.x + 1) / 2) * this.w;
      const y = ((1 - this.tmp.y) / 2) * this.h;
      el.style.left = `${x.toFixed(1)}px`;
      el.style.top = `${y.toFixed(1)}px`;
      const sel = b.item?.id === this.selectedId || b === this.hovered;
      let level: "full" | "mid" | "compact" | "hidden";
      if (this.tmp.z >= 1 || !b.mesh.visible) level = "hidden";
      else if (sel) level = "full";
      else if (b.kind === "travel" || b.kind === "boundary") level = z < 0.7 ? "compact" : "hidden";
      else if (z < 0.75) level = "full";
      else if (z < 1.35) level = "mid";
      else level = b.kind === "offer" ? "compact" : "hidden";
      if (level !== "hidden" && !sel) {
        const title = b.item?.label.length || 8;
        const w = (level === "compact" ? 6.6 * Math.min(title, 22) : 6.6 * Math.min(title, 26) + 24) + 14;
        const h = level === "full" ? 44 : level === "mid" ? 32 : 20;
        const r = { x: x - w / 2, y: y - h, w, h };
        if (placed.some((q) => r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h)) level = "hidden";
        else placed.push(r);
      } else if (level !== "hidden") {
        placed.push({ x: x - 70, y: y - 44, w: 140, h: 44 });
      }
      el.style.opacity = level === "hidden" ? "0" : "1";
      el.classList.toggle("compact", level === "compact");
      el.classList.toggle("mid", level === "mid");
      el.classList.toggle("selected", b.item?.id === this.selectedId);
    }
  }

  /* ---------- selection ---------- */

  setSelectedItem(id: string | null) {
    if (this.selEdges) {
      this.selEdges.parent?.remove(this.selEdges);
      this.selEdges.geometry.dispose();
      this.selEdges = null;
    }
    this.selectedId = id;
    const b = id ? this.blocks.find((x) => x.item?.id === id) : null;
    if (b) {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(b.mesh.geometry), this.holoEdge);
      b.mesh.add(edges);
      this.selEdges = edges;
    }
    this.start();
  }

  /** The hand is the pointer: light up whatever block it is over, no cursor drawn. */
  hoverAt(nx: number, ny: number, visible: boolean) {
    if (!visible) {
      this.ndc.set(-2, -2);
      if (!this.dragging && !this.grab) this.setHover(null);
      return;
    }
    this.pointer.x = nx * this.w;
    this.pointer.y = ny * this.h;
    this.ndc.set(nx * 2 - 1, -(ny * 2 - 1));
    this.start();
  }

  /** Where a normalised stage point lands: a block, or a day and snapped time on the week plane. */
  hitAt(nx: number, ny: number): { itemId?: string; day?: Day; time?: string } | null {
    this.ndc.set(nx * 2 - 1, -(ny * 2 - 1));
    const hit = this.hitBlock();
    if (hit?.item) return { itemId: hit.item.id, day: hit.day.day, time: fromMinutes(Math.round(hit.s * 60)) };
    const slot = this.slotAt(nx, ny, 0, 0);
    return slot ? { day: slot.day, time: slot.start } : null;
  }

  slotAt(nx: number, ny: number, zPlane: number, durationMin: number): SlotTarget | null {
    this.ndc.set(nx * 2 - 1, -(ny * 2 - 1));
    this.ray.setFromCamera(this.ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -zPlane);
    const p = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(plane, p)) return null;
    const di = Math.round(p.x / SPACING + 3);
    if (di < 0 || di > 6) return null;
    const day = this.bases[di]?.day.day || DAYS[di];
    let startMin = Math.round(((p.y / UNIT + H0) * 60) / 15) * 15;
    startMin = Math.max(H0 * 60, Math.min(H1 * 60 - durationMin, startMin));
    const endMin = startMin + durationMin;
    return { day, start: fromMinutes(startMin), end: endMin >= H1 * 60 ? "23:59" : fromMinutes(endMin) };
  }

  /* ---------- move preview ---------- */

  startPreview(itemId: string): boolean {
    this.clearPreview();
    const b = this.blocks.find((x) => x.item?.id === itemId);
    if (!b || b.rest || b.kind === "boundary" || b.kind === "travel") return false;
    const ghost = new THREE.Mesh(b.mesh.geometry, b.mesh.material.clone());
    ghost.material.transparent = true;
    ghost.material.opacity = 0.42;
    ghost.material.emissive.setHex(HOLO);
    ghost.material.emissiveIntensity = 0.5;
    ghost.position.copy(b.mesh.position);
    ghost.add(new THREE.LineSegments(new THREE.EdgesGeometry(b.mesh.geometry), this.holoEdge));
    this.scene.add(ghost);
    this.preview = { block: b, ghost, target: null, durationMin: Math.round((b.e - b.s) * 60) };
    this.start();
    return true;
  }

  movePreview(nx: number, ny: number): SlotTarget | null {
    const p = this.preview;
    if (!p) return null;
    const z = (this.exploded ? p.block.layer.z : 0) + p.block.home.z;
    const slot = this.slotAt(nx, ny, z, p.durationMin);
    if (!slot) return p.target;
    p.target = slot;
    const di = DAYS.indexOf(slot.day);
    const x = (di - 3) * SPACING + (p.block.home.x - (DAYS.indexOf(p.block.day.day) - 3) * SPACING);
    p.ghost.position.set(x + (this.exploded ? p.block.layer.x : 0), this.yOf(minutes(slot.start) / 60) + (this.exploded ? p.block.layer.y : 0), z);
    this.start();
    return slot;
  }

  endPreview(): SlotTarget | null {
    return this.preview?.target || null;
  }

  clearPreview() {
    if (!this.preview) return;
    this.scene.remove(this.preview.ghost);
    this.preview.ghost.material.dispose();
    this.preview = null;
    this.start();
  }

  /* ---------- create ghost ---------- */

  showCreateGhost(nx: number, ny: number, durationMin: number): SlotTarget | null {
    const slot = this.slotAt(nx, ny, 0.14, durationMin);
    if (!slot) return this.createGhost?.target || null;
    if (!this.createGhost) {
      const h = (durationMin / 60) * UNIT;
      const geo = new THREE.BoxGeometry(0.72, h, 0.72);
      geo.translate(0, h / 2, 0);
      const m = this.mats.personal!.clone();
      m.transparent = true;
      m.opacity = 0.45;
      m.emissive.setHex(HOLO);
      m.emissiveIntensity = 0.5;
      const mesh = new THREE.Mesh(geo, m);
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.holoEdge));
      this.scene.add(mesh);
      this.createGhost = { mesh, target: slot };
    }
    const di = DAYS.indexOf(slot.day);
    this.createGhost.mesh.position.set((di - 3) * SPACING + 0.12, this.yOf(minutes(slot.start) / 60), 0.14);
    this.createGhost.target = slot;
    this.start();
    return slot;
  }

  clearCreateGhost() {
    if (!this.createGhost) return;
    this.scene.remove(this.createGhost.mesh);
    this.createGhost.mesh.geometry.dispose();
    this.createGhost.mesh.material.dispose();
    this.createGhost = null;
    this.start();
  }

  /* ---------- smoothed camera control ---------- */

  setZoomLevel(v01: number) {
    const v = Math.max(0, Math.min(1, v01));
    this.zoomTarget = ZOOM_MAX - v * (ZOOM_MAX - ZOOM_MIN);
    this.lastInteract = this.now();
    this.start();
  }

  zoomBy(factor: number) {
    this.zoomTarget = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoomTarget * factor));
    this.lastInteract = this.now();
    this.start();
  }

  nudgeOrbit(dTheta: number, dPhi: number) {
    this.thetaTarget += dTheta;
    this.baseTheta = this.thetaTarget;
    this.phiTarget = Math.min(1.5, Math.max(0.55, this.phiTarget + dPhi));
    this.lastInteract = this.now();
    this.start();
  }

  baseMat(day: DayView) {
    if (this.selected === day.day) return this.mats.baseSel!;
    if (day.rest) return this.mats.baseRest!;
    if (day.today) return this.mats.baseToday!;
    return this.mats.base!;
  }

  setSelected(day: Day | null) {
    this.selected = day;
    this.bases.forEach((b) => {
      b.mesh.material = this.baseMat(b.day);
    });
    this.start();
  }

  resize() {
    const r = this.stage.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    this.orbit.r = Math.max(24, 36 / this.camera.aspect);
  }

  placeCamera() {
    const s = Math.sin(this.orbit.phi);
    const r = this.orbit.r * this.zoom;
    this.camera.position.set(
      this.target.x + r * s * Math.sin(this.orbit.theta),
      this.target.y + r * Math.cos(this.orbit.phi),
      this.target.z + r * s * Math.cos(this.orbit.theta),
    );
    this.camera.lookAt(this.target);
  }

  setZoom(z: number) {
    this.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    this.zoomTarget = this.zoom;
    this.lastInteract = this.now();
    this.start();
  }

  resetView() {
    this.baseTheta = 0.4;
    this.orbit.theta = 0.4;
    this.thetaTarget = 0.4;
    this.orbit.phi = 1.2;
    this.phiTarget = 1.2;
    this.zoom = this.mode === "immersive" ? 0.85 : 1;
    this.zoomTarget = this.zoom;
    this.lastInteract = this.now();
    this.start();
  }

  placeLabel(item: { el: HTMLElement; pos: THREE.Vector3 }) {
    this.tmp.copy(item.pos).project(this.camera);
    item.el.style.left = `${(((this.tmp.x + 1) / 2) * this.w).toFixed(1)}px`;
    item.el.style.top = `${(((1 - this.tmp.y) / 2) * this.h).toFixed(1)}px`;
    item.el.style.opacity = this.tmp.z < 1 ? "1" : "0";
  }

  setNDC(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.x = e.clientX - r.left;
    this.pointer.y = e.clientY - r.top;
    this.ndc.x = (this.pointer.x / r.width) * 2 - 1;
    this.ndc.y = -(this.pointer.y / r.height) * 2 + 1;
  }

  hitBlock(): Block | null {
    this.ray.setFromCamera(this.ndc, this.camera);
    const hits = this.ray.intersectObjects(
      this.blocks.filter((b) => b.mesh.visible).map((b) => b.mesh),
      false,
    );
    return hits.length ? this.blocks.find((b) => b.mesh === hits[0].object) || null : null;
  }

  showTip(b: Block) {
    this.tip.className = `tip${b.offer ? " offer" : ""}`;
    this.tip.innerHTML = `<b>${b.day.day} ${b.day.date} · ${fmt(b.s)}–${fmt(b.e)}</b>${b.label}`;
    this.tip.style.left = `${this.pointer.x}px`;
    this.tip.style.top = `${this.pointer.y}px`;
    this.tip.hidden = false;
  }

  setHover(b: Block | null) {
    if (this.hovered === b) {
      if (b) {
        this.tip.style.left = `${this.pointer.x}px`;
        this.tip.style.top = `${this.pointer.y}px`;
      }
      return;
    }
    this.hovered = b;
    if (b) {
      this.showTip(b);
      this.canvas.style.cursor = b.offer ? "pointer" : this.editable && !b.rest ? "grab" : "grab";
    } else {
      this.tip.hidden = true;
      this.canvas.style.cursor = "";
    }
  }

  /* ---------- grab, move, flick ---------- */

  startGrab(block: Block) {
    this.ray.setFromCamera(this.ndc, this.camera);
    const normal = this.camera.getWorldDirection(new THREE.Vector3()).negate();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, block.mesh.position);
    const point = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(plane, point)) return;
    const mat = block.mesh.material;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(block.mesh.geometry), this.holoEdge);
    block.mesh.add(edges);
    this.grab = {
      block,
      plane,
      offset: point.clone().sub(block.mesh.position),
      moved: false,
      targetDay: this.dayIndexOf(block.day),
      remove: false,
      samples: [{ x: this.pointer.x, y: this.pointer.y, t: performance.now() }],
      edges,
      savedEmissive: mat.emissive.clone(),
      savedOpacity: mat.opacity,
      savedTransparent: mat.transparent,
    };
    mat.transparent = true;
    mat.opacity = 0.78;
    mat.emissive.setHex(HOLO);
    mat.emissiveIntensity = 0.55;
    mat.needsUpdate = true;
    block.mesh.position.y += LIFT;
    this.blocks.forEach((b) => {
      if (b === block || b.rest) return;
      b.mesh.material.transparent = true;
      b.mesh.material.opacity = 0.45;
      b.mesh.material.needsUpdate = true;
    });
    this.ring.visible = true;
    this.ringMat.color.setHex(HOLO);
    this.ring.position.set(block.home.x, 0.02, 0);
    this.tip.hidden = true;
    this.hovered = null;
    this.stage.classList.add("grabbing");
    this.canvas.style.cursor = "grabbing";
    this.lastInteract = this.now();
    this.start();
  }

  dayIndexOf(day: DayView): number {
    return this.bases.findIndex((b) => b.day === day);
  }

  moveGrab(e: PointerEvent) {
    const g = this.grab;
    if (!g) return;
    this.ray.setFromCamera(this.ndc, this.camera);
    const point = new THREE.Vector3();
    if (this.ray.ray.intersectPlane(g.plane, point)) {
      const p = point.sub(g.offset);
      g.block.mesh.position.set(p.x, Math.max(0.1, p.y + LIFT), 0);
      g.moved = g.moved || g.block.mesh.position.distanceTo(g.block.home) > 0.25;
    }
    g.samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (g.samples.length > 6) g.samples.shift();
    const di = Math.max(0, Math.min(6, Math.round(g.block.mesh.position.x / SPACING + 3)));
    g.targetDay = di;
    let overBin = false;
    if (this.bin) {
      const r = this.bin.getBoundingClientRect();
      overBin = e.clientX >= r.left - 16 && e.clientX <= r.right + 16 && e.clientY >= r.top - 16 && e.clientY <= r.bottom + 16;
    }
    g.remove = overBin;
    this.bin?.classList.toggle("active", overBin);
    const mat = g.block.mesh.material;
    mat.emissive.setHex(overBin ? DANGER : HOLO);
    this.holoEdge.color.setHex(overBin ? DANGER : HOLO);
    this.ringMat.color.setHex(overBin ? DANGER : HOLO);
    this.ring.position.set((di - 3) * SPACING, 0.02, 0);
    this.lastInteract = this.now();
  }

  flickSpeed(g: Grab): number {
    const s = g.samples;
    if (s.length < 2) return 0;
    const a = s[0];
    const b = s[s.length - 1];
    const dt = Math.max(1, b.t - a.t);
    return Math.hypot(b.x - a.x, b.y - a.y) / dt;
  }

  endGrab(commit: boolean) {
    const g = this.grab;
    if (!g) return;
    this.grab = null;
    this.stage.classList.remove("grabbing");
    this.bin?.classList.remove("active");
    this.ring.visible = false;
    this.holoEdge.color.setHex(HOLO);
    this.canvas.style.cursor = "";
    g.block.mesh.remove(g.edges);
    g.edges.geometry.dispose();
    const mat = g.block.mesh.material;
    mat.emissive.copy(g.savedEmissive);
    mat.emissiveIntensity = g.block.offer ? 0.3 : 0;
    mat.opacity = g.savedOpacity;
    mat.transparent = g.savedTransparent;
    mat.needsUpdate = true;
    this.blocks.forEach((b) => {
      if (b === g.block || b.rest) return;
      const key = (b.mesh.userData.key as MatKey) || "shift";
      const src = this.mats[key]!;
      b.mesh.material.opacity = src.opacity;
      b.mesh.material.transparent = src.transparent;
      b.mesh.material.needsUpdate = true;
    });
    const item = g.block.item;
    if (commit && item) {
      const flick = this.flickSpeed(g) > 1.4;
      if (g.remove || flick) {
        this.shatter(g.block);
        this.onRemove({ item, from: g.block.day.day });
        return;
      }
      const fromIdx = this.dayIndexOf(g.block.day);
      if (g.moved && g.targetDay !== fromIdx && item.kind === "personal") {
        const to = this.bases[g.targetDay]?.day.day;
        if (to) {
          g.block.mesh.position.set((g.targetDay - 3) * SPACING + 0.12, g.block.home.y, 0.14);
          g.block.home.copy(g.block.mesh.position);
          this.onMoveItem({ item, from: g.block.day.day }, to);
          return;
        }
      }
    }
    this.returning.push({ block: g.block, from: g.block.mesh.position.clone(), t0: this.now() });
    this.start();
  }

  shatter(block: Block) {
    const box = new THREE.Box3().setFromObject(block.mesh);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const color = block.mesh.material.color.clone();
    block.mesh.visible = false;
    const n = this.reduced ? 0 : 28;
    for (let i = 0; i < n; i++) {
      const sz = 0.1 + Math.random() * 0.18;
      const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, transparent: true, opacity: 1, roughness: 0.6 });
      const p = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), m);
      p.position.set(centre.x + (Math.random() - 0.5) * size.x, centre.y + (Math.random() - 0.5) * size.y, centre.z + (Math.random() - 0.5) * size.z);
      const v = new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6);
      const av = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      this.fxGroup.add(p);
      this.fx.push({ mesh: p, v, av, t0: this.now() });
    }
    this.lastInteract = this.now();
    this.start();
  }

  /* ---------- events ---------- */

  onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.setZoom(this.zoom * (1 + e.deltaY * 0.0015));
  };
  onDbl = () => this.resetView();
  onMove = (e: PointerEvent) => {
    this.setNDC(e);
    if (this.mouseDrag) {
      const md = this.mouseDrag;
      if (!md.moved && Math.hypot(e.clientX - this.last.x, e.clientY - this.last.y) > 6) {
        md.moved = true;
        this.startPreview(md.block.item!.id);
      }
      if (md.moved) {
        const r = this.canvas.getBoundingClientRect();
        this.movePreview((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      }
      return;
    }
    if (this.grab) {
      this.moveGrab(e);
      this.start();
      return;
    }
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0) this.setZoom(this.pinchZoom * (this.pinchDist / Math.max(1, d)));
      this.moved = true;
      return;
    }
    if (this.dragging) {
      const dx = e.clientX - this.last.x;
      const dy = e.clientY - this.last.y;
      this.last = { x: e.clientX, y: e.clientY };
      if (Math.abs(dx) + Math.abs(dy) > 2) this.moved = true;
      this.baseTheta -= dx * 0.006;
      this.orbit.theta = this.baseTheta;
      this.orbit.phi = Math.min(1.5, Math.max(0.55, this.orbit.phi - dy * 0.004));
      this.lastInteract = this.now();
      this.start();
    } else {
      this.start();
    }
  };
  onDown = (e: PointerEvent) => {
    this.setNDC(e);
    this.stage.classList.add("touched");
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {}
    if (this.grab || this.mouseDrag) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1 && this.mode === "immersive") {
      const hit = this.hitBlock();
      if (hit?.item && !hit.rest && hit.kind !== "boundary" && hit.kind !== "travel") {
        this.mouseDrag = { block: hit, moved: false };
        this.last = { x: e.clientX, y: e.clientY };
        this.start();
        return;
      }
    }
    if (this.pointers.size === 1 && this.editable) {
      const hit = this.hitBlock();
      if (hit && !hit.rest && hit.item) {
        this.startGrab(hit);
        return;
      }
    }
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.pinchZoom = this.zoom;
      this.moved = true;
    }
    this.dragging = true;
    this.moved = this.pointers.size > 1;
    this.last = { x: e.clientX, y: e.clientY };
    this.stage.classList.add("dragging");
    this.start();
  };
  onUp = (e: PointerEvent) => {
    if (this.mouseDrag) {
      const md = this.mouseDrag;
      this.mouseDrag = null;
      this.pointers.delete(e.pointerId);
      if (md.moved) {
        const t = this.endPreview();
        if (t && md.block.item) this.onPreviewEnd?.(t, md.block.item.id);
        else this.clearPreview();
      } else {
        if (md.block.offer && md.block.offerId) this.onTap(md.block.offerId);
        this.onSelect?.(md.block.item?.id || null);
      }
      return;
    }
    if (this.grab) {
      const g = this.grab;
      const tap = !g.moved && this.flickSpeed(g) < 0.3;
      this.endGrab(!tap);
      this.pointers.delete(e.pointerId);
      if (tap) {
        if (g.block.offer && g.block.offerId) this.onTap(g.block.offerId);
        else this.onDayTap(g.block.day.day);
      }
      return;
    }
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (this.pointers.size > 0) {
      const p = [...this.pointers.values()][0];
      this.last = { x: p.x, y: p.y };
      return;
    }
    if (!this.dragging) return;
    this.dragging = false;
    this.stage.classList.remove("dragging");
    this.lastInteract = this.now();
    if (!this.moved) {
      const hit = this.hitBlock();
      if (hit?.offer && hit.offerId) this.onTap(hit.offerId);
      else if (hit) {
        this.onDayTap(hit.day.day);
        if (e.pointerType === "touch") this.showTip(hit);
      } else {
        this.ray.setFromCamera(this.ndc, this.camera);
        const baseHits = this.ray.intersectObjects(
          this.bases.map((b) => b.mesh),
          false,
        );
        if (baseHits.length) {
          const b = this.bases.find((x) => x.mesh === baseHits[0].object);
          if (b) this.onDayTap(b.day.day);
        }
        if (this.mode === "immersive") this.onSelect?.(null);
      }
    }
  };
  onLeave = () => {
    this.ndc.set(-2, -2);
    if (!this.dragging && !this.grab) this.setHover(null);
  };

  bind() {
    this.canvas.addEventListener("pointermove", this.onMove);
    this.canvas.addEventListener("pointerdown", this.onDown);
    this.canvas.addEventListener("pointerup", this.onUp);
    this.canvas.addEventListener("pointercancel", this.onUp);
    this.canvas.addEventListener("pointerleave", this.onLeave);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("dblclick", this.onDbl);
    if ("ResizeObserver" in window) {
      this.ro = new ResizeObserver(() => {
        this.resize();
        this.start();
      });
      this.ro.observe(this.stage);
    }
    try {
      this.mo = new MutationObserver(() => {
        this.makeMats();
        this.start();
      });
      this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    } catch {}
    try {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", this.onTheme);
    } catch {}
    document.addEventListener("visibilitychange", this.onVis);
  }
  onTheme = () => {
    this.makeMats();
    this.start();
  };
  onVis = () => {
    if (document.hidden) this.stop();
    else this.start();
  };

  frame = () => {
    this.raf = null;
    if (!this.running || this.disposed) return;
    const t = this.now();
    const dt = Math.min(0.05, t - this.lastFrame || 0.016);
    this.lastFrame = t;
    const busy = !!this.grab || this.fx.length > 0 || this.returning.length > 0 || !!this.preview || !!this.createGhost || !!this.mouseDrag;
    if (this.mode === "immersive") {
      // gesture and button driven targets ease in; mouse drag writes orbit directly
      const k = this.reduced ? 1 : 0.14;
      if (!this.dragging) {
        this.orbit.theta += (this.thetaTarget - this.orbit.theta) * k;
        this.orbit.phi += (this.phiTarget - this.orbit.phi) * k;
      } else {
        this.thetaTarget = this.orbit.theta;
        this.phiTarget = this.orbit.phi;
      }
      this.zoom += (this.zoomTarget - this.zoom) * k;
    } else if (!this.reduced && !this.dragging && !busy && t - this.lastInteract > 3) this.orbit.theta = this.baseTheta + Math.sin(t * 0.22) * 0.15;
    this.placeCamera();
    // exploded layers ease into place
    const ek = this.reduced ? 1 : 0.12;
    let settling = false;
    this.blocks.forEach((b) => {
      if (this.grab?.block === b || this.returning.some((r) => r.block === b)) return;
      const target = this.exploded ? b.home.clone().add(b.layer) : b.home;
      if (b.mesh.position.distanceToSquared(target) > 1e-6) {
        b.mesh.position.lerp(target, ek);
        settling = true;
      }
    });
    if (!this.dragging && !this.grab && this.ndc.x > -2) this.setHover(this.hitBlock());
    this.blocks.forEach((b) => {
      const k = this.reduced ? 1 : Math.min(1, Math.max(0, (t - this.started - b.delay) / 0.75));
      const grow = k >= 1 ? 1 : easeOutBack(k);
      let sx = 1;
      let sz = 1;
      const grabbed = this.grab?.block === b;
      if ((b === this.hovered || grabbed) && !b.rest) sx = sz = grabbed ? 1.12 : 1.08;
      if (b.offer && !this.reduced && !grabbed) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
        b.mesh.material.emissiveIntensity = 0.22 + 0.38 * pulse;
        if (b !== this.hovered) sx = sz = 1 + 0.03 * pulse;
      }
      if (grabbed && !this.reduced) b.mesh.material.emissiveIntensity = 0.45 + 0.25 * (0.5 + 0.5 * Math.sin(t * 6));
      if (b.rest && !this.reduced) b.mesh.material.opacity = 0.18 + 0.07 * (0.5 + 0.5 * Math.sin(t * 1.1));
      b.mesh.scale.x += (sx - b.mesh.scale.x) * 0.18;
      b.mesh.scale.z += (sz - b.mesh.scale.z) * 0.18;
      b.mesh.scale.y = Math.max(0.001, grow);
      if (!b.rest && !b.offer && !grabbed) b.mesh.material.emissiveIntensity = b === this.hovered ? (this.mode === "immersive" ? 0.4 : 0.18) : 0;
    });
    if (this.ring.visible && !this.reduced) {
      const p = 1 + 0.06 * Math.sin(t * 5);
      this.ring.scale.set(p, p, p);
      this.ringMat.opacity = 0.4 + 0.25 * (0.5 + 0.5 * Math.sin(t * 5));
    }
    this.returning = this.returning.filter((r) => {
      const k = Math.min(1, (t - r.t0) / 0.28);
      const ease = 1 - Math.pow(1 - k, 3);
      r.block.mesh.position.lerpVectors(r.from, r.block.home, ease);
      return k < 1;
    });
    this.fx = this.fx.filter((f) => {
      const age = t - f.t0;
      if (age > 0.75) {
        this.fxGroup.remove(f.mesh);
        f.mesh.geometry.dispose();
        f.mesh.material.dispose();
        return false;
      }
      f.v.y -= 9 * dt;
      f.mesh.position.addScaledVector(f.v, dt);
      f.mesh.rotation.x += f.av.x * dt;
      f.mesh.rotation.y += f.av.y * dt;
      f.mesh.rotation.z += f.av.z * dt;
      const life = 1 - age / 0.75;
      f.mesh.material.opacity = life;
      f.mesh.scale.setScalar(0.4 + 0.6 * life);
      return true;
    });
    if (this.preview && !this.reduced) this.preview.ghost.material.emissiveIntensity = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(t * 5));
    if (this.createGhost && !this.reduced) this.createGhost.mesh.material.emissiveIntensity = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(t * 5));
    this.dayLabels.forEach((l) => this.placeLabel(l));
    this.hourLabels.forEach((l) => this.placeLabel(l));
    if (this.detail) this.placeBlockLabels();
    const t1 = performance.now();
    this.renderer.render(this.scene, this.camera);
    // slower devices: drop the pixel ratio once rendering is consistently slow
    if (performance.now() - t1 > 24) {
      this.slowFrames += 1;
      if (this.slowFrames > 30 && this.renderer.getPixelRatio() > 1) {
        this.renderer.setPixelRatio(1);
        this.slowFrames = 0;
      }
    } else this.slowFrames = Math.max(0, this.slowFrames - 1);
    const cameraMoving = this.mode === "immersive" && (Math.abs(this.thetaTarget - this.orbit.theta) > 1e-3 || Math.abs(this.phiTarget - this.orbit.phi) > 1e-3 || Math.abs(this.zoomTarget - this.zoom) > 1e-3);
    const settled = (this.reduced || this.mode === "immersive") && !this.dragging && !busy && !settling && !cameraMoving && t - this.lastInteract > 0.5 && t - this.started > 1;
    if (!settled) this.raf = requestAnimationFrame(this.frame);
    else this.running = false;
  };

  start() {
    if (this.disposed) return;
    if (!this.running) {
      this.running = true;
      this.lastFrame = this.now();
      if (this.raf === null) this.raf = requestAnimationFrame(this.frame);
    }
  }
  stop() {
    this.running = false;
  }

  dispose() {
    this.disposed = true;
    this.stop();
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    this.canvas.removeEventListener("pointerleave", this.onLeave);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("dblclick", this.onDbl);
    this.ro?.disconnect();
    this.mo?.disconnect();
    try {
      window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", this.onTheme);
    } catch {}
    document.removeEventListener("visibilitychange", this.onVis);
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.fx.forEach((f) => {
      f.mesh.geometry.dispose();
      f.mesh.material.dispose();
    });
    this.clearPreview();
    this.clearCreateGhost();
    this.connectors.forEach((l) => l.geometry.dispose());
    this.dashMat.dispose();
    Object.values(this.mats).forEach((m) => m?.dispose());
    this.guide?.dispose();
    this.edge?.dispose();
    this.holoEdge.dispose();
    this.ringMat.dispose();
    this.ring.geometry.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

function fallbackHtml(days: DayView[]): string {
  let html = "";
  [12, 18, 24].forEach((h) => {
    html += `<div class="fb-h" style="top:calc(18px + (100% - 48px) * ${((h - H0) / (H1 - H0)).toFixed(4)})">${fmt(h)}</div>`;
  });
  days.forEach((day) => {
    html += `<div class="fb-col${day.rest ? " rest" : ""}">`;
    day.items.forEach((it) => {
      if (it.kind === "rest" || it.kind === "due") return;
      const s = Math.max(H0, hours(it.start));
      const e = Math.min(H1, hours(it.end));
      const top = (((s - H0) / (H1 - H0)) * 100).toFixed(2);
      const hgt = (((e - s) / (H1 - H0)) * 100).toFixed(2);
      const cls = it.kind === "shift" && it.employer === "mcd" ? "mcd" : it.kind;
      html += `<div class="fb-blk ${cls}" style="top:${top}%;height:${hgt}%" title="${day.day} ${it.start}–${it.end} ${it.label}"></div>`;
    });
    html += `<div class="fb-lab">${day.day} ${day.date}</div></div>`;
  });
  return html;
}

const BinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

export default function Week3D({
  days,
  onOfferTap,
  onDayTap,
  onRemove,
  onMove,
  selectedDay,
  height = 250,
  className = "",
  hint = "drag to orbit",
  editable = false,
  detail = false,
  immersive = false,
  selectedId = null,
  onSelect,
  onPreviewEnd,
  onReady,
}: {
  days: DayView[];
  onOfferTap: (offerId: string) => void;
  onDayTap?: (day: Day) => void;
  onRemove?: (t: DropTarget) => void;
  onMove?: (t: DropTarget, to: Day) => void;
  selectedDay?: Day | null;
  height?: number | string;
  className?: string;
  hint?: string;
  editable?: boolean;
  detail?: boolean;
  immersive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onPreviewEnd?: (target: SlotTarget, itemId: string) => void;
  onReady?: (handle: SceneHandle) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const fbRef = useRef<HTMLDivElement>(null);
  const binRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<WeekScene | null>(null);
  const tapRef = useRef(onOfferTap);
  tapRef.current = onOfferTap;
  const dayTapRef = useRef(onDayTap);
  dayTapRef.current = onDayTap;
  const removeRef = useRef(onRemove);
  removeRef.current = onRemove;
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const previewRef = useRef(onPreviewEnd);
  previewRef.current = onPreviewEnd;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const daysRef = useRef(days);
  daysRef.current = days;
  const key = JSON.stringify(days.map((d) => [d.day, d.rest, d.today, d.items.map((i) => [i.kind, i.start, i.end, i.label, i.offerId, i.employer])]));

  useEffect(() => {
    const stage = stageRef.current;
    const labels = labelsRef.current;
    const tip = tipRef.current;
    const fb = fbRef.current;
    if (!stage || !labels || !tip || !fb) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", "Three-dimensional view of the week: blocks for shifts, uni, plans, offers and rest");
    stage.insertBefore(canvas, labels);
    const hintEl = stage.querySelector<HTMLElement>(".hint");
    try {
      const scene = new WeekScene(
        stage,
        canvas,
        labels,
        tip,
        binRef.current,
        (id) => tapRef.current(id),
        (d) => dayTapRef.current?.(d),
        (t) => removeRef.current?.(t),
        (t, to) => moveRef.current?.(t, to),
      );
      scene.editable = editable;
      scene.mode = immersive ? "immersive" : "board";
      scene.detail = detail || immersive;
      scene.onSelect = (id) => selectRef.current?.(id);
      scene.onPreviewEnd = (t, id) => previewRef.current?.(t, id);
      scene.selectedId = selectedId;
      if (immersive) {
        scene.zoom = 0.85;
        scene.zoomTarget = 0.85;
      }
      sceneRef.current = scene;
      const w = window as unknown as { __weekScenes?: WeekScene[] };
      (w.__weekScenes ||= []).push(scene);
      readyRef.current?.({
        setExploded: (v) => scene.setExploded(v),
        isExploded: () => scene.exploded,
        setSelectedItem: (id) => scene.setSelectedItem(id),
        hitAt: (nx, ny) => scene.hitAt(nx, ny),
        startPreview: (id) => scene.startPreview(id),
        movePreview: (nx, ny) => scene.movePreview(nx, ny),
        endPreview: () => scene.endPreview(),
        clearPreview: () => scene.clearPreview(),
        showCreateGhost: (nx, ny, d) => scene.showCreateGhost(nx, ny, d),
        clearCreateGhost: () => scene.clearCreateGhost(),
        setZoomLevel: (v) => scene.setZoomLevel(v),
        zoomBy: (f) => scene.zoomBy(f),
        nudgeOrbit: (a, b) => scene.nudgeOrbit(a, b),
        resetView: () => scene.resetView(),
        hoverAt: (nx, ny, v) => scene.hoverAt(nx, ny, v),
      });
      scene.selected = selectedDay ?? null;
      scene.setDays(daysRef.current);
      labels.hidden = false;
      fb.hidden = true;
      if (hintEl) hintEl.hidden = false;
    } catch {
      canvas.remove();
      labels.hidden = true;
      if (hintEl) hintEl.hidden = true;
      fb.innerHTML = fallbackHtml(daysRef.current);
      fb.hidden = false;
      stage.style.cursor = "default";
    }
    return () => {
      const w = window as unknown as { __weekScenes?: WeekScene[] };
      if (w.__weekScenes && sceneRef.current) w.__weekScenes = w.__weekScenes.filter((x) => x !== sceneRef.current);
      sceneRef.current?.dispose();
      sceneRef.current = null;
      canvas.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.editable = editable;
  }, [editable]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.setDays(days);
    else if (fbRef.current && !fbRef.current.hidden) fbRef.current.innerHTML = fallbackHtml(days);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    sceneRef.current?.setSelected(selectedDay ?? null);
  }, [selectedDay]);

  useEffect(() => {
    sceneRef.current?.setSelectedItem(selectedId ?? null);
  }, [selectedId]);

  return (
    <div className={`stage ${className}${editable ? " editable" : ""}`} ref={stageRef} style={{ height }}>
      <div className="labels" ref={labelsRef} />
      <div className="tip" ref={tipRef} hidden />
      <div className="hint">{hint}</div>
      {editable && (
        <div className="bin" ref={binRef} aria-hidden="true">
          <BinIcon />
        </div>
      )}
      <div className="fallback" ref={fbRef} hidden />
    </div>
  );
}
