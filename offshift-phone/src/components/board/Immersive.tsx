"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Week3D, { type SceneHandle, type SlotTarget } from "@/components/apps/offshift/Week3D";
import { buildDays, dayListWithTravel, type DataState } from "@/lib/checks";
import { GestureEngine, type FaceBox, type GestureEvent, type HandFrame } from "@/lib/gestures";
import { openingLines } from "@/lib/assistant";
import { startHandTracking, type HandTracker } from "@/lib/hands";
import { DAYS, DAY_NAMES, clock12, dayIndex, minutes, range12 } from "@/lib/logic";
import { EMPLOYERS, SCENARIO } from "@/lib/scenario";
import { createSpeaker, type Speaker } from "@/lib/speech";
import { useStore } from "@/lib/store";
import type { Day, DayItem, DayView, Importance, PlanCategory } from "@/lib/types";

const LINE_EXPLODE = "I have separated your schedule into work, study, personal time, travel and rest.";
const LINE_COMBINE = "Your schedule is back in the weekly view.";
const CATEGORIES: { key: PlanCategory; label: string; title: string }[] = [
  { key: "study", label: "Study", title: "Study block" },
  { key: "personal", label: "Personal", title: "Personal time" },
  { key: "rest", label: "Rest", title: "Rest" },
  { key: "appointment", label: "Appointment", title: "Appointment" },
  { key: "custom", label: "Custom", title: "" },
];

type Pending =
  | { kind: "move"; itemId: string; title: string; from: SlotTarget; to: SlotTarget; warnings: string[] }
  | { kind: "negotiate"; itemId: string; title: string; employer: "pandora" | "mcd"; to: SlotTarget; draft: string }
  | { kind: "create"; slot: SlotTarget; step: "ask" | "form"; category: PlanCategory; title: string; start: string; end: string; importance: Importance }
  | { kind: "protect"; itemId: string; title: string };

interface UndoEntry {
  label: string;
  undo: () => void;
}

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
function recognitionCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Items a proposed slot would touch, in plain words. Facts only, no advice. */
function slotWarnings(state: DataState, itemId: string, slot: SlotTarget, days: DayView[]): string[] {
  const out: string[] = [];
  const view = days.find((d) => d.day === slot.day);
  if (!view) return out;
  const s = minutes(slot.start);
  const e = minutes(slot.end);
  view.items
    .filter((it) => it.id !== itemId && it.kind !== "travel" && it.kind !== "boundary" && it.kind !== "rest" && it.kind !== "due")
    .forEach((it) => {
      if (minutes(it.start) < e && s < minutes(it.end)) out.push(`Overlaps ${it.label}, ${range12(it.start, it.end)}.`);
    });
  const before = view.items.filter((it) => it.id !== itemId && it.kind !== "travel" && it.kind !== "boundary" && it.kind !== "rest" && it.kind !== "due" && minutes(it.end) <= s).sort((a, b) => minutes(b.end) - minutes(a.end))[0];
  if (before) {
    const gap = s - minutes(before.end);
    const need = before.kind === "uni" ? state.settings.travelFromUniMin : 20;
    if (gap < need) out.push(`Only ${gap} minutes after ${before.label} ends at ${clock12(before.end)}; travel takes about ${need}.`);
  }
  if (slot.day === state.settings.protectedDay) out.push(`Sits on ${DAY_NAMES[slot.day]}, your protected rest day.`);
  if (e > 22 * 60) out.push("Runs into quiet hours after 10 pm.");
  const nd = DAYS[dayIndex(slot.day) + 1];
  const next = nd && days.find((d) => d.day === nd)?.items.filter((it) => it.kind === "shift" || it.kind === "uni").sort((a, b) => minutes(a.start) - minutes(b.start))[0];
  if (next && e > 21 * 60 && 24 * 60 - e + minutes(next.start) < 10 * 60) out.push(`Leaves ${Math.round((24 * 60 - e + minutes(next.start)) / 60)} hours before ${DAY_NAMES[nd]}'s ${clock12(next.start)} start.`);
  return out;
}

function describe(item: DayItem, day: Day, days: DayView[]): string {
  const view = days.find((d) => d.day === day);
  const range = item.kind === "rest" ? "all day" : range12(item.start, item.end);
  let text = `${item.label.replace(/ · .*$/, "")} selected. ${DAY_NAMES[day]}, ${range}.`;
  const overlap = view?.items.find((o) => o.id !== item.id && o.kind !== "travel" && o.kind !== "boundary" && o.kind !== "rest" && o.kind !== "due" && minutes(o.start) < minutes(item.end) && minutes(item.start) < minutes(o.end));
  if (overlap) {
    const name = overlap.label.replace(/ · .*$/, "");
    text += ` This ${item.kind === "shift" ? "shift" : item.kind === "offer" ? "ask" : "block"} overlaps with ${name.charAt(0).toLowerCase() + name.slice(1)} from ${range12(overlap.start, overlap.end)}.`;
  }
  if (item.protected) text += " Protected by you.";
  return text;
}

export default function Immersive({ onExit }: { onExit: () => void }) {
  const state = useStore();
  const updatePersonal = useStore((s) => s.updatePersonal);
  const addPersonal = useStore((s) => s.addPersonal);
  const removePersonal = useStore((s) => s.removePersonal);
  const setProtected = useStore((s) => s.setProtected);
  const sendMessage = useStore((s) => s.sendMessage);
  const openApp = useStore((s) => s.openApp);
  const notePrivate = useStore((s) => s.notePrivate);
  const resetDemo = useStore((s) => s.resetDemo);

  const handle = useRef<SceneHandle | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exploded, setExploded] = useState(false);
  const [caption, setCaption] = useState("");
  const [muted, setMuted] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [undo, setUndo] = useState<UndoEntry[]>([]);
  const [touch, setTouch] = useState(false);
  const [consent, setConsent] = useState<"camera" | "mic" | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Camera off");
  const [handsCount, setHandsCount] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean; pinching: boolean }>({ x: 0.5, y: 0.5, visible: false, pinching: false });
  const [question, setQuestion] = useState<"plan" | "mood" | null>(null);
  const questionRef = useRef<"plan" | "mood" | null>(null);
  questionRef.current = question;
  const [face, setFace] = useState<FaceBox | null>(null);
  const [scanning, setScanning] = useState(false);
  const greeted = useRef(false);
  const lastGreetAt = useRef(0);
  const faceLastSeen = useRef(0);
  const faceStateAt = useRef(0);
  const greetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [heard, setHeard] = useState("");
  const speaker = useRef<Speaker | null>(null);
  const engine = useRef(new GestureEngine());
  const tracker = useRef<HandTracker | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rec = useRef<SR | null>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const pinch = useRef<{ itemId: string | null; creating: boolean; previewing: boolean }>({ itemId: null, creating: false, previewing: false });
  const reduced = useMemo(() => (typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false), []);

  if (!speaker.current) speaker.current = createSpeaker(setCaption);
  const say = useCallback((text: string, force = false) => speaker.current?.say(text, { force }), []);

  /* ---------- data: week + travel + boundaries, straight from the shared store ---------- */
  const base = useMemo(() => buildDays(state), [state.shifts, state.uni, state.personal, state.offers, state.settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo<DayView[]>(
    () =>
      base.map((d) => {
        const withTravel = dayListWithTravel(d, state).map((it) => (it.travelFor ? { ...it, kind: "travel" as const, status: "Estimated", source: "Offshift" } : it));
        const items: DayItem[] = withTravel.filter((it) => it.kind !== "due");
        if (!d.rest) items.push({ id: `bound-${d.day}`, kind: "boundary", start: "22:00", end: "24:00", label: "Quiet hours", source: "Offshift", status: "Boundary · after 10 pm" });
        return { ...d, items };
      }),
    [base, state], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const selected = useMemo(() => {
    for (const d of days) for (const it of d.items) if (it.id === selectedId) return { item: it, day: d.day };
    return null;
  }, [days, selectedId]);

  /* ---------- actions ---------- */
  const pushUndo = (e: UndoEntry) => setUndo((u) => [...u.slice(-9), e]);

  const selectItem = useCallback(
    (id: string | null, speakIt = true) => {
      setSelectedId(id);
      handle.current?.setSelectedItem(id);
      if (!id) return;
      for (const d of days) {
        const it = d.items.find((x) => x.id === id);
        if (it && speakIt) say(describe(it, d.day, days));
      }
    },
    [days, say],
  );

  const proposeMove = useCallback(
    (itemId: string, to: SlotTarget) => {
      let found: { item: DayItem; day: Day } | null = null;
      for (const d of days) for (const it of d.items) if (it.id === itemId) found = { item: it, day: d.day };
      if (!found) return;
      const { item, day } = found;
      const title = item.label.replace(/ · .*$/, "");
      if (item.kind === "shift" && item.employer) {
        const emp = EMPLOYERS[item.employer];
        const draft = `Hi ${emp.manager.name}, would it be possible to move my ${DAY_NAMES[day]} ${range12(item.start, item.end)} shift to ${DAY_NAMES[to.day]} ${range12(to.start, to.end)}? Happy to talk it through.`;
        setPending({ kind: "negotiate", itemId, title, employer: item.employer, to, draft });
        say(`${title} is a rostered shift, so it stays where it is. Thumbs up to send ${emp.manager.name} a request, thumbs down to leave it.`);
        return;
      }
      if (item.kind !== "personal") {
        handle.current?.clearPreview();
        say(`${title} comes from ${item.source}. It can be moved there.`);
        return;
      }
      const warnings = slotWarnings(state, itemId, to, days);
      setPending({ kind: "move", itemId, title, from: { day, start: item.start, end: item.end }, to, warnings });
      say(`Preview. ${title} would move to ${DAY_NAMES[to.day]}, ${range12(to.start, to.end)}. ${warnings[0] || "Nothing overlaps."} Thumbs up to confirm, thumbs down to keep the original.`);
    },
    [days, state, say],
  );

  function confirmPending() {
    const p = pending;
    if (!p) return;
    if (p.kind === "move") {
      updatePersonal(p.itemId, { day: p.to.day, start: p.to.start, end: p.to.end });
      pushUndo({ label: `Move ${p.title}`, undo: () => updatePersonal(p.itemId, { day: p.from.day, start: p.from.start, end: p.from.end }) });
      handle.current?.clearPreview();
      say(`Moved to ${DAY_NAMES[p.to.day]}, ${range12(p.to.start, p.to.end)}. You can undo this.`);
    } else if (p.kind === "negotiate") {
      sendMessage(p.employer, "dinda", p.draft);
      handle.current?.clearPreview();
      say(`Request sent to ${EMPLOYERS[p.employer].manager.name}. The shift is unchanged until they reply.`);
    } else if (p.kind === "create") {
      if (p.step === "ask") return;
      const title = p.title.trim() || CATEGORIES.find((c) => c.key === p.category)?.title || "New plan";
      if (minutes(p.end) <= minutes(p.start)) {
        say("The finish time needs to be after the start.");
        return;
      }
      const id = addPersonal({ day: p.slot.day, start: p.start, end: p.end, title, category: p.category, importance: p.importance });
      pushUndo({ label: `Add ${title}`, undo: () => removePersonal(id) });
      handle.current?.clearCreateGhost();
      say(`Added ${title}, ${DAY_NAMES[p.slot.day]} ${range12(p.start, p.end)}.`);
      setSelectedId(id);
    } else if (p.kind === "protect") {
      setProtected(p.itemId, true);
      pushUndo({ label: `Protect ${p.title}`, undo: () => setProtected(p.itemId, false) });
      say("Protected by you. You can still change it later.");
    }
    setPending(null);
  }

  function cancelPending() {
    if (!pending) return;
    handle.current?.clearPreview();
    handle.current?.clearCreateGhost();
    say(pending.kind === "move" ? "Kept the original." : pending.kind === "create" ? "Nothing added." : "Cancelled.");
    setPending(null);
  }

  function doUndo() {
    const last = undo[undo.length - 1];
    if (!last) return;
    last.undo();
    setUndo((u) => u.slice(0, -1));
    say(`Undone: ${last.label.toLowerCase()}.`);
  }

  function explode(v: boolean) {
    if (v === exploded) return;
    setExploded(v);
    engine.current.setExploded(v);
    handle.current?.setExploded(v);
    say(v ? LINE_EXPLODE : LINE_COMBINE);
  }

  function startCreate(slot: SlotTarget, category: PlanCategory = "personal") {
    setPending({ kind: "create", slot, step: "ask", category, title: "", start: slot.start, end: slot.end, importance: "flexible" });
    say("What would you like to add here? One finger for study, two for personal, three for rest, four for an appointment.");
  }

  function chooseCategory(count: number) {
    const p = pending;
    if (!p || p.kind !== "create" || p.step !== "ask") return;
    const c = CATEGORIES[Math.min(3, Math.max(0, count - 1))];
    setPending({ ...p, step: "form", category: c.key, title: c.title, importance: c.key === "rest" ? "protected" : "flexible" });
    say(`${c.label}, ${DAY_NAMES[p.slot.day]} ${range12(p.start, p.end)}. Thumbs up to add it, thumbs down to leave it.`);
  }

  function defaultSlot(): SlotTarget {
    const day = selected?.day || SCENARIO.today;
    return { day, start: "18:00", end: "19:00" };
  }

  function askProtect(id: string) {
    for (const d of days) {
      const it = d.items.find((x) => x.id === id);
      if (!it) continue;
      if (it.protected) {
        setProtected(id, false);
        say("Protection removed.");
        return;
      }
      setPending({ kind: "protect", itemId: id, title: it.label.replace(/ · .*$/, "") });
      say("Would you like to protect this time? Thumbs up for yes.");
    }
  }

  /* ---------- opening greeting and check-in ---------- */
  const runGreeting = useCallback(async () => {
    const sp = speaker.current;
    if (!sp || greeted.current) return;
    greeted.current = true;
    lastGreetAt.current = Date.now();
    const lines = openingLines(useStore.getState());
    for (const l of lines) await sp.sayAsync(l);
    setQuestion("plan");
    await sp.sayAsync("Do you wish to change your plan? Thumbs up for yes, thumbs down for no.");
  }, []);

  const answerQuestion = useCallback(
    (dir: "up" | "down") => {
      const q = questionRef.current;
      const sp = speaker.current;
      if (!q || !sp) return false;
      if (q === "plan") {
        setQuestion("mood");
        (async () => {
          await sp.sayAsync(dir === "up" ? "Pinch and drag anything to move it, or pinch and hold a space to add something." : "All right. I'll leave it as it is.");
          await sp.sayAsync("How are you today? Thumbs up if you're good, thumbs down if not so good.");
        })();
      } else {
        setQuestion(null);
        notePrivate(dir === "up" ? "Check-in: feeling good." : "Check-in: not so good today.");
        sp.say(dir === "up" ? "Good to hear. That stays between us." : "Thanks for telling me. That stays between us, and nothing here is decided for you.");
      }
      return true;
    },
    [notePrivate],
  );

  useEffect(() => {
    greetTimer.current = setTimeout(() => void runGreeting(), 900);
    return () => {
      if (greetTimer.current) clearTimeout(greetTimer.current);
    };
  }, [runGreeting]);

  /* ---------- gestures ---------- */
  const onGesture = useCallback(
    (ev: GestureEvent) => {
      const h = handle.current;
      if (!h) return;
      const pn = pinch.current;
      switch (ev.type) {
        case "hands":
          setHandsCount(ev.count);
          break;
        case "explode":
          explode(true);
          break;
        case "combine":
          explode(false);
          break;
        case "zoom":
          h.setZoomLevel(ev.value);
          break;
        case "orbit":
          h.nudgeOrbit(ev.dTheta, ev.dPhi);
          break;
        case "cursor":
          h.hoverAt(ev.x, ev.y, ev.visible);
          setCursor({ x: ev.x, y: ev.y, visible: ev.visible, pinching: ev.pinching });
          break;
        case "thumbs":
          if (pending) {
            if (ev.dir === "up") confirmPending();
            else cancelPending();
          } else answerQuestion(ev.dir);
          break;
        case "fistHold":
          doUndo();
          break;
        case "fingers":
          chooseCategory(ev.count);
          break;
        case "pinchStart": {
          const hit = h.hitAt(ev.x, ev.y);
          pn.itemId = hit?.itemId || null;
          pn.creating = false;
          pn.previewing = false;
          break;
        }
        case "pinchHold":
          if (!pn.itemId && !pending) {
            pn.creating = true;
            h.showCreateGhost(ev.x, ev.y, 60);
          }
          break;
        case "pinchMove":
          if (pn.creating) h.showCreateGhost(ev.x, ev.y, 60);
          else if (pn.itemId) {
            if (!pn.previewing) pn.previewing = h.startPreview(pn.itemId);
            if (pn.previewing) h.movePreview(ev.x, ev.y);
          }
          break;
        case "pinchEnd":
          if (pn.creating) {
            const slot = h.showCreateGhost(ev.x, ev.y, 60);
            if (slot) startCreate(slot);
          } else if (pn.previewing && pn.itemId) {
            const t = h.endPreview();
            if (t) proposeMove(pn.itemId, t);
            else h.clearPreview();
          } else if (pn.itemId && !ev.moved) {
            selectItem(pn.itemId);
          }
          pn.itemId = null;
          pn.creating = false;
          pn.previewing = false;
          break;
        case "palmHold":
          if (selectedId && !pending) {
            const hit = h.hitAt(ev.x, ev.y);
            if (hit?.itemId === selectedId) askProtect(selectedId);
          }
          break;
      }
    },
    [selectedId, pending, exploded, days, proposeMove, selectItem, answerQuestion], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const gestureRef = useRef(onGesture);
  gestureRef.current = onGesture;

  useEffect(() => {
    engine.current.mode = pending?.kind === "create" && pending.step === "ask" ? "choose" : "normal";
  }, [pending]);

  const feed = useCallback(
    (frame: HandFrame) => {
      const events = engine.current.update(frame);
      for (const ev of events) gestureRef.current(ev);
      if (frame.face !== undefined) {
        const now = Date.now();
        if (frame.face) {
          const arrived = now - faceLastSeen.current > 30000;
          faceLastSeen.current = now;
          if (arrived) {
            setScanning(true);
            setTimeout(() => setScanning(false), 1800);
            if (now - lastGreetAt.current > 60000) {
              greeted.current = false;
              if (greetTimer.current) clearTimeout(greetTimer.current);
              speaker.current?.say("Scanning. Someone's here.");
              greetTimer.current = setTimeout(() => void runGreeting(), 1600);
            }
          }
        }
        if (now - faceStateAt.current > 150) {
          faceStateAt.current = now;
          setFace(frame.face);
        }
      }
    },
    [runGreeting],
  );

  useEffect(() => {
    (window as unknown as { __offshiftGestures?: { inject: (f: HandFrame) => void } }).__offshiftGestures = { inject: feed };
    return () => {
      delete (window as unknown as { __offshiftGestures?: unknown }).__offshiftGestures;
    };
  }, [feed]);

  async function enableCamera() {
    setConsent(null);
    try {
      sessionStorage.setItem("offshift-camera-consent", "1");
    } catch {}
    const v = videoRef.current;
    if (!v) return;
    try {
      tracker.current = await startHandTracking(v, feed, setCameraStatus);
      setCameraOn(true);
    } catch (e) {
      setCameraStatus(e instanceof Error && /NotAllowed|Permission/i.test(e.message) ? "Camera not allowed" : "Camera unavailable");
      setCameraOn(false);
    }
  }
  function disableCamera() {
    tracker.current?.stop();
    tracker.current = null;
    setCameraOn(false);
    setHandsCount(0);
    handle.current?.hoverAt(0, 0, false);
    setCursor((c) => ({ ...c, visible: false }));
  }

  /* ---------- voice commands ---------- */
  function enableVoice() {
    setConsent(null);
    const Ctor = recognitionCtor();
    if (!Ctor || !window.isSecureContext) {
      setHeard("Voice input needs HTTPS and a supported browser.");
      return;
    }
    const r = new Ctor();
    r.lang = "en-AU";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const t = last[0].transcript.trim().toLowerCase();
      setHeard(t);
      commandRef.current(t);
    };
    r.onend = () => {
      if (rec.current === r) {
        try {
          r.start();
        } catch {}
      }
    };
    r.onerror = () => {};
    rec.current = r;
    try {
      r.start();
      setVoiceOn(true);
    } catch {
      setVoiceOn(false);
    }
  }
  function disableVoice() {
    const r = rec.current;
    rec.current = null;
    try {
      r?.stop();
    } catch {}
    setVoiceOn(false);
  }
  const command = (t: string) => {
    if (/\b(confirm|yes|go ahead)\b/.test(t)) confirmPending();
    else if (/\b(cancel|keep|no thanks)\b/.test(t)) cancelPending();
    else if (/\bundo\b/.test(t)) doUndo();
    else if (/\b(expand|separate|explode)\b/.test(t)) explode(true);
    else if (/\b(full week|whole week|show week|combine|back to week)\b/.test(t)) {
      explode(false);
      handle.current?.resetView();
    } else if (/\badd rest\b/.test(t)) {
      const slot = defaultSlot();
      setPending({ kind: "create", slot, step: "form", category: "rest", title: "Rest", start: slot.start, end: slot.end, importance: "protected" });
      say("Rest. Choose the day and time, then confirm.");
    } else if (/\bmute\b/.test(t)) toggleMute(true);
  };
  const commandRef = useRef(command);
  commandRef.current = command;

  function toggleMute(m?: boolean) {
    const next = m ?? !muted;
    setMuted(next);
    speaker.current?.setMuted(next);
  }

  /* ---------- lifecycle ---------- */
  useEffect(() => {
    const sp = speaker.current;
    return () => {
      tracker.current?.stop();
      tracker.current = null;
      try {
        rec.current?.stop();
      } catch {}
      rec.current = null;
      sp?.stop();
    };
  }, []);

  // one stable listener: re-registering during a keystroke would make the browser skip it
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    {
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === "function" && target.closest("input, textarea, select")) return;
      const h = handle.current;
      if (e.key === "Escape") {
        if (pending) cancelPending();
        else onExit();
      } else if (e.key === "Enter" && pending) confirmPending();
      else if (e.key === "ArrowLeft") h?.nudgeOrbit(-0.12, 0);
      else if (e.key === "ArrowRight") h?.nudgeOrbit(0.12, 0);
      else if (e.key === "ArrowUp") h?.nudgeOrbit(0, -0.06);
      else if (e.key === "ArrowDown") h?.nudgeOrbit(0, 0.06);
      else if (e.key === "+" || e.key === "=") h?.zoomBy(0.85);
      else if (e.key === "-") h?.zoomBy(1.18);
      else if (e.key.toLowerCase() === "u" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        doUndo();
      }
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selInfo = selected ? selectedInfo(selected.item, selected.day, days, state) : null;

  return (
    <div className="imm" role="dialog" aria-label="Immersive calendar">
      <div className={`imm-frame${touch ? " touch" : ""}`}>
        <div className="imm-top">
          <div className="eyebrow">Immersive week · {SCENARIO.weekLabel}</div>
          <div className="imm-status">
            <span className={`dot ${cameraOn ? "on" : ""}`} /> {cameraStatus}
            {cameraOn ? ` · ${handsCount} hand${handsCount === 1 ? "" : "s"}` : ""}
          </div>
          <div className="spacer" />
          <button className="btn small neutral" onClick={() => handle.current?.resetView()}>
            Reset view
          </button>
          <button className={`btn small ${cameraOn ? "" : "neutral"}`} onClick={() => (cameraOn ? disableCamera() : sessionStorage.getItem("offshift-camera-consent") ? enableCamera() : setConsent("camera"))}>
            {cameraOn ? "Camera off" : "Camera on"}
          </button>
          <button className={`btn small ${voiceOn ? "" : "neutral"}`} onClick={() => (voiceOn ? disableVoice() : setConsent("mic"))}>
            {voiceOn ? "Voice off" : "Voice on"}
          </button>
          <button className={`btn small ${touch ? "" : "neutral"}`} aria-pressed={touch} onClick={() => setTouch((v) => !v)}>
            Use touch controls
          </button>
          <button className={`btn small ${muted ? "" : "neutral"}`} aria-pressed={muted} onClick={() => toggleMute()}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            className="btn small ghost"
            onClick={() => {
              if (confirm("Reset the scenario? Jess's ask comes back and every change is cleared on all devices.")) {
                resetDemo();
                setPending(null);
                setSelectedId(null);
                handle.current?.setSelectedItem(null);
                setUndo([]);
                say("Scenario reset. Jess's ask is waiting again.");
              }
            }}
          >
            Reset scenario
          </button>
          <button className="btn small" onClick={onExit}>
            Exit
          </button>
        </div>

        <aside className="imm-left">
          <div className="k">Gestures</div>
          <ul className="gest">
            <li>
              <b>Both palms open</b> separate the layers
            </li>
            <li>
              <b>Close both hands</b> back to the week
            </li>
            <li>
              <b>Hands apart or together</b> zoom
            </li>
            <li>
              <b>Move both hands</b> rotate and tilt
            </li>
            <li>
              <b>Pinch</b> select a block
            </li>
            <li>
              <b>Pinch and drag</b> preview a move
            </li>
            <li>
              <b>Pinch and hold empty space</b> add
            </li>
            <li>
              <b>Open palm over the selection</b> protect
            </li>
            <li>
              <b>Thumbs up</b> confirm
            </li>
            <li>
              <b>Thumbs down</b> cancel or keep
            </li>
            <li>
              <b>Hold a fist</b> undo
            </li>
            <li>
              <b>Raise fingers</b> choose what to add
            </li>
          </ul>
          <div className="cam">
            <video ref={videoRef} className={cameraOn ? "" : "off"} aria-label="Camera preview, mirrored" />
            {cameraOn && face && (
              <div className={`face-box${scanning ? " scanning" : ""}`} style={{ left: `${face.x * 100}%`, top: `${face.y * 100}%`, width: `${face.w * 100}%`, height: `${face.h * 100}%` }} aria-hidden="true">
                <i className="c tl" />
                <i className="c tr" />
                <i className="c bl" />
                <i className="c br" />
                <i className="sweep" />
              </div>
            )}
            {cameraOn && <span className="presence">{face ? "someone's here · presence only" : "looking for you"}</span>}
            {!cameraOn && <span>Camera is optional. Video stays in this browser and nothing is saved.</span>}
          </div>
          <div className="k">Without a camera</div>
          <ul className="gest">
            <li>Drag to rotate, wheel or buttons to zoom</li>
            <li>Click a block to select, drag it to preview a move</li>
            <li>Arrow keys rotate, + and − zoom, Esc exits</li>
          </ul>
        </aside>

        <div className="imm-centre" ref={stageBox}>
          <Week3D
            days={days}
            immersive
            detail
            selectedId={selectedId}
            height="100%"
            className="big imm-stage"
            hint=""
            onOfferTap={(id) => {
              selectItem(days.flatMap((d) => d.items).find((it) => it.offerId === id)?.id || null);
            }}
            onSelect={(id) => selectItem(id)}
            onPreviewEnd={(t, id) => proposeMove(id, t)}
            onReady={(h) => {
              handle.current = h;
              h.setExploded(exploded);
              if (selectedId) h.setSelectedItem(selectedId);
            }}
          />
          {cursor.visible && <div className={`hand-cursor${cursor.pinching ? " pinch" : ""}`} style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }} aria-hidden="true" />}
          <div className="imm-tools">
            <button className="btn small neutral" onClick={() => explode(true)} disabled={exploded}>
              Expand layers
            </button>
            <button className="btn small neutral" onClick={() => explode(false)} disabled={!exploded}>
              Combine layers
            </button>
            <button className="btn small neutral" onClick={() => handle.current?.zoomBy(0.8)} aria-label="Zoom in">
              +
            </button>
            <button className="btn small neutral" onClick={() => handle.current?.zoomBy(1.25)} aria-label="Zoom out">
              −
            </button>
            <button className="btn small neutral" onClick={() => startCreate(defaultSlot())}>
              Add event
            </button>
            <button className="btn small neutral" onClick={doUndo} disabled={!undo.length}>
              Undo{undo.length ? ` · ${undo[undo.length - 1].label}` : ""}
            </button>
          </div>
          {touch && (
            <div className="touch-pad" aria-label="Touch controls">
              <button onPointerDown={() => handle.current?.nudgeOrbit(-0.18, 0)} aria-label="Rotate left">
                ⟲
              </button>
              <button onPointerDown={() => handle.current?.nudgeOrbit(0, -0.08)} aria-label="Tilt up">
                ↑
              </button>
              <button onPointerDown={() => handle.current?.nudgeOrbit(0, 0.08)} aria-label="Tilt down">
                ↓
              </button>
              <button onPointerDown={() => handle.current?.nudgeOrbit(0.18, 0)} aria-label="Rotate right">
                ⟳
              </button>
            </div>
          )}
        </div>

        <aside className="imm-right">
          {pending ? (
            <PendingPanel pending={pending} setPending={setPending} onConfirm={confirmPending} onCancel={cancelPending} />
          ) : selected && selInfo ? (
            <div className="sel">
              <div className="eyebrow">{selInfo.category}</div>
              <h2>{selInfo.title}</h2>
              <p className="when">
                {DAY_NAMES[selected.day]} · {selected.item.kind === "rest" ? "all day" : range12(selected.item.start, selected.item.end)}
              </p>
              <div className="facts">
                {selInfo.facts.map((f, i) => (
                  <div key={i} className={`fact ${f.tone}`}>
                    {f.text}
                  </div>
                ))}
              </div>
              <div className="sel-actions">
                {selected.item.kind !== "boundary" && selected.item.kind !== "travel" && selected.item.kind !== "rest" && (
                  <button className="btn small neutral" onClick={() => askProtect(selected.item.id)}>
                    {selected.item.protected ? "Remove protection" : "Protect this time"}
                  </button>
                )}
                {selected.item.kind === "offer" && selected.item.offerId && (
                  <button className="btn small" onClick={() => openApp("offshift", { screen: "offer", offerId: selected.item.offerId })}>
                    Open in Offshift
                  </button>
                )}
                <button className="btn small ghost" onClick={() => selectItem(null)}>
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="sel empty">
              <div className="eyebrow">Selection</div>
              <p>Pinch or click a block to see it here.</p>
            </div>
          )}
        </aside>

        <div className="imm-bottom">
          <div className={`caption${muted ? " muted" : ""}`} aria-live="polite">
            {caption || "Offshift"}
            {pending && <span className="hint-gest">{pending.kind === "create" && pending.step === "ask" ? "raise 1–4 fingers" : "👍 confirm · 👎 cancel"}</span>}
            {!pending && question && <span className="hint-gest">👍 yes · 👎 no</span>}
            {voiceOn && heard && <span className="heard">heard: “{heard}”</span>}
          </div>
          <div className="imm-actions">
            {!pending && question && (
              <>
                <button className="btn small" onClick={() => answerQuestion("up")}>
                  Yes
                </button>
                <button className="btn small neutral" onClick={() => answerQuestion("down")}>
                  No
                </button>
              </>
            )}
            {pending && (
              <>
                <button className="btn small" onClick={confirmPending} disabled={pending.kind === "create" && pending.step === "ask"}>
                  {pending.kind === "move" ? "Confirm move" : pending.kind === "negotiate" ? "Send request" : pending.kind === "create" ? "Add" : "Yes, protect"}
                </button>
                <button className="btn small neutral" onClick={cancelPending}>
                  {pending.kind === "move" ? "Keep original" : "Cancel"}
                </button>
              </>
            )}
          </div>
        </div>

        {consent && (
          <div className="consent" role="dialog" aria-modal="true" aria-label={consent === "camera" ? "Camera" : "Microphone"}>
            <div className="consent-box">
              <h2>{consent === "camera" ? "Use the camera for hand gestures?" : "Use the microphone for voice commands?"}</h2>
              {consent === "camera" ? (
                <ul>
                  <li>Optional. Everything works with mouse, touch and keyboard.</li>
                  <li>Video is processed in this browser and never leaves it.</li>
                  <li>No images or video are saved.</li>
                  <li>Hand positions steer the calendar. A face detector only notices that someone is there, to say hello.</li>
                  <li>No identity, no expressions, no emotion analysis.</li>
                </ul>
              ) : (
                <ul>
                  <li>Optional. Every command has a button.</li>
                  <li>Listens only while Voice is on. Turn it off any time.</li>
                  <li>Commands: confirm, cancel, undo, expand calendar, show full week, add rest.</li>
                </ul>
              )}
              <div className="btn-row">
                <button className="btn" onClick={() => (consent === "camera" ? enableCamera() : enableVoice())}>
                  {consent === "camera" ? "Turn camera on" : "Turn voice on"}
                </button>
                <button className="btn neutral" onClick={() => setConsent(null)}>
                  Not now
                </button>
              </div>
            </div>
          </div>
        )}
        {reduced && <span className="sr">Reduced motion is on: layers move without animation.</span>}
      </div>
    </div>
  );
}

function selectedInfo(item: DayItem, day: Day, days: DayView[], state: DataState) {
  const cat = item.kind === "shift" ? "Work shift" : item.kind === "uni" ? "University" : item.kind === "offer" ? "Pending ask" : item.kind === "travel" ? "Travel" : item.kind === "boundary" ? "Boundary" : item.kind === "rest" ? "Protected rest" : item.category === "study" ? "Study" : item.category === "rest" ? "Rest" : item.category === "appointment" ? "Appointment" : "Personal";
  const facts: { text: string; tone: "" | "warn" | "ok" }[] = [];
  facts.push({ text: `${item.status || "Scheduled"} · ${item.source}`, tone: "" });
  const view = days.find((d) => d.day === day)!;
  view.items
    .filter((o) => o.id !== item.id && o.kind !== "travel" && o.kind !== "boundary" && o.kind !== "rest" && o.kind !== "due" && minutes(o.start) < minutes(item.end) && minutes(item.start) < minutes(o.end))
    .forEach((o) => facts.push({ text: `Overlaps ${o.label.replace(/ · .*$/, "")}, ${range12(o.start, o.end)}`, tone: "warn" }));
  if (item.kind === "shift" || item.kind === "offer") {
    const before = view.items.filter((o) => o.id !== item.id && (o.kind === "uni" || o.kind === "personal" || o.kind === "shift") && minutes(o.end) <= minutes(item.start)).sort((a, b) => minutes(b.end) - minutes(a.end))[0];
    if (before) {
      const need = before.kind === "uni" ? state.settings.travelFromUniMin : 20;
      const gap = minutes(item.start) - minutes(before.end);
      facts.push({ text: `${gap} min after ${before.label.replace(/ · .*$/, "")}; travel about ${need} min`, tone: gap - need < 15 ? "warn" : "ok" });
    }
    const nd = DAYS[dayIndex(day) + 1];
    const next = nd && days.find((d) => d.day === nd)?.items.filter((o) => o.kind === "shift" || o.kind === "uni").sort((a, b) => minutes(a.start) - minutes(b.start))[0];
    if (next) facts.push({ text: `${Math.round((24 * 60 - minutes(item.end) + minutes(next.start)) / 60)} h before ${DAY_NAMES[nd]}'s ${clock12(next.start)} start`, tone: "" });
    if (item.employer) facts.push({ text: `About $${Math.round(((minutes(item.end) - minutes(item.start)) / 60) * (day === "Sat" ? EMPLOYERS[item.employer].satRate : EMPLOYERS[item.employer].rate))}`, tone: "" });
  }
  if (minutes(item.end) > 22 * 60 && item.kind !== "boundary" && item.kind !== "rest") facts.push({ text: "Runs into quiet hours after 10 pm", tone: "warn" });
  if (day === state.settings.protectedDay && item.kind !== "rest") facts.push({ text: `${DAY_NAMES[day]} is your protected rest day`, tone: "warn" });
  if (item.protected) facts.push({ text: "Protected by you", tone: "ok" });
  return { title: item.label.replace(/ · .*$/, ""), category: cat, facts };
}

function PendingPanel({ pending, setPending, onConfirm, onCancel }: { pending: Pending; setPending: (p: Pending | null) => void; onConfirm: () => void; onCancel: () => void }) {
  const [edit, setEdit] = useState(false);
  if (pending.kind === "move") {
    return (
      <div className="pend">
        <div className="eyebrow">Preview move</div>
        <h2>{pending.title}</h2>
        <p className="when">
          <s>
            {DAY_NAMES[pending.from.day]} {range12(pending.from.start, pending.from.end)}
          </s>
          <br />→ {DAY_NAMES[pending.to.day]} {range12(pending.to.start, pending.to.end)}
        </p>
        <div className="facts">
          {pending.warnings.length ? pending.warnings.map((w, i) => <div key={i} className="fact warn">{w}</div>) : <div className="fact ok">Nothing overlaps.</div>}
        </div>
        {edit && (
          <div className="form-grid">
            <div className="field">
              <label htmlFor="mv-start">Start</label>
              <input id="mv-start" type="time" step={900} value={pending.to.start} onChange={(e) => setPending({ ...pending, to: { ...pending.to, start: e.target.value } })} />
            </div>
            <div className="field">
              <label htmlFor="mv-end">Finish</label>
              <input id="mv-end" type="time" step={900} value={pending.to.end} onChange={(e) => setPending({ ...pending, to: { ...pending.to, end: e.target.value } })} />
            </div>
            <div className="field full">
              <label htmlFor="mv-day">Day</label>
              <select id="mv-day" value={pending.to.day} onChange={(e) => setPending({ ...pending, to: { ...pending.to, day: e.target.value as Day } })}>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_NAMES[d]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="btn-col">
          <button className="btn" onClick={onConfirm}>
            Confirm move
          </button>
          <button className="btn neutral" onClick={onCancel}>
            Keep original
          </button>
          <button className="btn ghost" onClick={() => setEdit((v) => !v)}>
            {edit ? "Hide time" : "Edit time"}
          </button>
        </div>
      </div>
    );
  }
  if (pending.kind === "negotiate") {
    return (
      <div className="pend">
        <div className="eyebrow">Rostered shift</div>
        <h2>{pending.title}</h2>
        <p className="when">Employer shifts don't move here. You can ask {EMPLOYERS[pending.employer].manager.name} instead.</p>
        <textarea className="draft" value={pending.draft} onChange={(e) => setPending({ ...pending, draft: e.target.value })} aria-label="Request" />
        <div className="btn-col">
          <button className="btn" onClick={onConfirm}>
            Send request
          </button>
          <button className="btn neutral" onClick={onCancel}>
            Discard
          </button>
        </div>
      </div>
    );
  }
  if (pending.kind === "create") {
    return (
      <div className="pend">
        <div className="eyebrow">New · {DAY_NAMES[pending.slot.day]}</div>
        <h2>{pending.step === "ask" ? "What would you like to add here?" : CATEGORIES.find((c) => c.key === pending.category)?.label}</h2>
        {pending.step === "ask" ? (
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c.key} className="chip" onClick={() => setPending({ ...pending, step: "form", category: c.key, title: c.title, importance: c.key === "rest" ? "protected" : "flexible" })}>
                {c.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="cr-title">Title</label>
              <input id="cr-title" value={pending.title} onChange={(e) => setPending({ ...pending, title: e.target.value })} placeholder="What is it?" autoFocus />
            </div>
            <div className="field">
              <label htmlFor="cr-start">Start</label>
              <input id="cr-start" type="time" step={900} value={pending.start} onChange={(e) => setPending({ ...pending, start: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="cr-end">Finish</label>
              <input id="cr-end" type="time" step={900} value={pending.end} onChange={(e) => setPending({ ...pending, end: e.target.value })} />
            </div>
            <div className="field full">
              <label htmlFor="cr-day">Day</label>
              <select id="cr-day" value={pending.slot.day} onChange={(e) => setPending({ ...pending, slot: { ...pending.slot, day: e.target.value as Day } })}>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_NAMES[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label>Importance</label>
              <div className="seg">
                {(["flexible", "important", "protected"] as Importance[]).map((i) => (
                  <button key={i} aria-pressed={pending.importance === i} onClick={() => setPending({ ...pending, importance: i })}>
                    {i.charAt(0).toUpperCase() + i.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="btn-col">
          {pending.step === "form" && (
            <button className="btn" onClick={onConfirm}>
              Add
            </button>
          )}
          <button className="btn neutral" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="pend">
      <div className="eyebrow">Protect</div>
      <h2>{pending.title}</h2>
      <p className="when">Would you like to protect this time? It stays yours to change later.</p>
      <div className="btn-col">
        <button className="btn" onClick={onConfirm}>
          Yes, protect
        </button>
        <button className="btn neutral" onClick={onCancel}>
          Not now
        </button>
      </div>
    </div>
  );
}
