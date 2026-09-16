"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ANNOUNCE, BRIEF, replyTextFor, type AssistantAction } from "@/lib/assistant";
import { offerWhen } from "@/lib/checks";
import { pickData, useStore } from "@/lib/store";
import type { Day } from "@/lib/types";

type Status = "idle" | "thinking" | "speaking" | "listening";
interface Line {
  who: "assistant" | "you";
  text: string;
}

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SRCtor = new () => SR;

function recognitionCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const VOICE_PREFS = ["Daniel", "Karen", "Moira", "Samantha", "Google UK English Male", "Google UK English Female", "Microsoft Ryan", "Microsoft Sonia"];

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  for (const name of VOICE_PREFS) {
    const v = voices.find((x) => x.name.startsWith(name));
    if (v) return v;
  }
  return voices.find((v) => /^en-(AU|GB)/.test(v.lang)) || voices.find((v) => v.lang.startsWith("en")) || null;
}

export default function Assistant({ onShowDay, onShowOffer }: { onShowDay: (day: Day) => void; onShowOffer: (id: string | null) => void }) {
  const respond = useStore((s) => s.respondToOffer);
  const addPersonal = useStore((s) => s.addPersonal);
  const pendingIds = useStore((s) => s.offers.filter((o) => o.status === "pending" || o.status === "deferred").map((o) => o.id).join(","));
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [shown, setShown] = useState("");
  const [interim, setInterim] = useState("");
  const [typed, setTyped] = useState("");
  const [scripted, setScripted] = useState<boolean | null>(null);
  const [canListen, setCanListen] = useState(false);
  const history = useRef<unknown[]>([]);
  const armed = useRef(false);
  const rec = useRef<SR | null>(null);
  const seenIds = useRef<string | null>(null);
  const busy = useRef(false);
  const linesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = linesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, shown, interim, status]);

  useEffect(() => {
    setCanListen(!!recognitionCtor() && window.isSecureContext);
    try {
      speechSynthesis.getVoices();
      speechSynthesis.addEventListener("voiceschanged", () => speechSynthesis.getVoices());
    } catch {}
  }, []);

  const speak = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      if (typeof speechSynthesis === "undefined") {
        setShown(text);
        resolve();
        return;
      }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/(\d)\s*–\s*(\d)/g, "$1 to $2").replace(/–/g, " to ").replace(/ · /g, ", ").replace(/\s*\((Calendar|myUQ|Offshift)\)/g, ""));
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.rate = 1;
      u.pitch = 1;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        setShown(text);
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      // reveal the words roughly as they are spoken
      let i = 0;
      const step = Math.max(45, 60000 / Math.max(80, text.length * 6));
      const t = setInterval(() => {
        i += 2;
        setShown(text.slice(0, i));
        if (i >= text.length) clearInterval(t);
      }, step);
      setStatus("speaking");
      speechSynthesis.speak(u);
      setTimeout(finish, 1200 + text.length * 90); // safety net if the engine never fires onend
    });
  }, []);

  const apply = useCallback(
    (actions: AssistantAction[]) => {
      const s = useStore.getState();
      for (const a of actions) {
        if (a.type === "respond") {
          const o = s.offers.find((x) => x.id === a.offerId);
          if (!o) continue;
          respond(a.offerId, a.decision, replyTextFor(s, a.offerId, a.decision), { reminderMinutes: 30 });
          onShowOffer(null);
        } else if (a.type === "add_plan") {
          addPersonal({ title: a.title, day: a.day, start: a.start, end: a.end });
          onShowDay(a.day);
        } else if (a.type === "show_day") {
          onShowDay(a.day);
          onShowOffer(null);
        }
      }
    },
    [respond, addPersonal, onShowDay, onShowOffer],
  );

  const listen = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || !window.isSecureContext) return;
    try {
      rec.current?.abort();
    } catch {}
    const r = new Ctor();
    r.lang = "en-AU";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript);
      const t = parts.join(" ").trim();
      setInterim(t);
      if (e.results[e.results.length - 1].isFinal) finalText = t;
    };
    r.onend = () => {
      setInterim("");
      setStatus("idle");
      rec.current = null;
      if (finalText) void ask(finalText, finalText); // eslint-disable-line @typescript-eslint/no-use-before-define
    };
    r.onerror = () => {
      setInterim("");
      setStatus("idle");
      rec.current = null;
    };
    rec.current = r;
    setStatus("listening");
    try {
      r.start();
    } catch {
      setStatus("idle");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ask = useCallback(
    async (input: string, display?: string) => {
      if (busy.current) return;
      busy.current = true;
      try {
        rec.current?.abort();
      } catch {}
      setOpen(true);
      if (display) setLines((l) => [...l, { who: "you", text: display }]);
      setStatus("thinking");
      setShown("");
      let text = "";
      let actions: AssistantAction[] = [];
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ input, history: history.current, state: pickData(useStore.getState()) }),
        });
        const j = (await res.json()) as { text: string; actions: AssistantAction[]; history: unknown[]; scripted: boolean };
        text = j.text || "";
        actions = j.actions || [];
        history.current = j.history || history.current;
        setScripted(j.scripted);
      } catch {
        text = "I can't reach the assistant right now.";
      }
      apply(actions);
      if (text) setLines((l) => [...l, { who: "assistant", text }]);
      await speak(text);
      setStatus("idle");
      busy.current = false;
      if (/\?\s*$/.test(text) && canListen) listen();
    },
    [apply, speak, listen, canListen],
  );

  // proactive: a new ask arrived while the assistant is armed
  useEffect(() => {
    if (seenIds.current === null) {
      seenIds.current = pendingIds;
      return;
    }
    const before = new Set(seenIds.current.split(",").filter(Boolean));
    const fresh = pendingIds.split(",").filter((id) => id && !before.has(id));
    seenIds.current = pendingIds;
    if (fresh.length && armed.current && !busy.current) void ask(`${ANNOUNCE}${fresh[0]}`);
  }, [pendingIds, ask]);

  function onOrb() {
    armed.current = true;
    if (status === "speaking") {
      try {
        speechSynthesis.cancel();
      } catch {}
      setStatus("idle");
      busy.current = false;
      return;
    }
    if (status === "listening") {
      try {
        rec.current?.stop();
      } catch {}
      return;
    }
    if (!open || lines.length === 0) void ask(BRIEF);
    else if (canListen) listen();
    else setOpen((v) => !v);
  }

  const pending = useStore((s) => s.offers.find((o) => o.status === "pending" || o.status === "deferred"));
  const chips: [string, string, string][] = pending
    ? [
        ["Take it", "I'll take it.", "take"],
        [`Not ${offerWhen(pending)}`, `Not ${offerWhen(pending)}.`, "no"],
        ["Another time", "Offer another time instead.", "alt"],
        ["Swap", "Ask for a swap.", "swap"],
        ["Later", "Remind me later.", "later"],
      ]
    : [["Brief me", BRIEF, ""]];

  return (
    <div className={`assistant ${status}${open ? " open" : ""}`}>
      {open && (
        <div className="asst-panel">
          <div className="asst-head">
            <span className="asst-name">Offshift</span>
            <span className="asst-mode">{scripted === false ? "Claude Sonnet 5" : scripted ? "offline voice" : ""}</span>
            <button className="x" onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
          </div>
          <div className="asst-lines" ref={linesRef}>
            {lines.slice(0, -1).map((l, i) => (
              <p key={i} className={`l-${l.who}`}>
                {l.text}
              </p>
            ))}
            {lines.length > 0 && (
              <p className={`l-${lines[lines.length - 1].who} live`}>
                {lines[lines.length - 1].who === "assistant" && status === "speaking" ? shown : lines[lines.length - 1].text}
                {status === "speaking" && <i className="caret" />}
              </p>
            )}
            {status === "thinking" && <p className="l-assistant live thinking">…</p>}
            {status === "listening" && <p className="l-you live">{interim || "Listening…"}</p>}
          </div>
          <div className="asst-chips">
            {chips.map(([label, say, cls]) => (
              <button key={label} className={`chip ${cls}`} onClick={() => void ask(say, say === BRIEF ? undefined : label)} disabled={status === "thinking" || status === "speaking"}>
                {label}
              </button>
            ))}
          </div>
          <form
            className="asst-input"
            onSubmit={(e) => {
              e.preventDefault();
              const t = typed.trim();
              if (!t) return;
              setTyped("");
              void ask(t, t);
            }}
          >
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={canListen ? "Or type" : "Type a reply"} aria-label="Say something" />
            {canListen && (
              <button type="button" className={`mic${status === "listening" ? " on" : ""}`} onClick={() => (status === "listening" ? rec.current?.stop() : listen())} aria-label="Talk">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>
            )}
            <button type="submit" aria-label="Send">
              ↑
            </button>
          </form>
        </div>
      )}
      <button className="orb" onClick={onOrb} aria-label="Offshift assistant">
        <i className="r1" />
        <i className="r2" />
        <i className="r3" />
        <span className="core" />
        <span className="bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </button>
    </div>
  );
}
