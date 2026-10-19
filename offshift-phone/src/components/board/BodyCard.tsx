"use client";

import { BODY_SIGNALS, SIGNAL_LABELS, bodyState, signalWord } from "@/lib/body";
import { clock12 } from "@/lib/logic";
import { currentWearable } from "@/lib/checks";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import type { BodyLevel } from "@/lib/types";

const TONE: Record<BodyLevel, "ok" | "warn" | "bad"> = { 0: "bad", 1: "warn", 2: "ok", 3: "ok" };

/** The watch's latest reading in words. Only there while the worker shares it from the watch. */
export default function BodyCard() {
  const wearable = useStore((s) => s.wearable);
  const settings = useStore((s) => s.settings);
  const now = useNow(settings.timeZone);
  // A reading from hours ago says nothing about now, so it stops showing.
  const w = currentWearable({ shifts: [], uni: [], personal: [], offers: [], settings, wearable }, now);
  if (!w) return null;
  const signals = BODY_SIGNALS.filter((k) => w.signals?.[k] !== undefined);
  return (
    <section className="body-card" aria-label="Body">
      <div className="body-head">
        <span className="k">Body</span>
        <small>
          {w.source} · {clock12(w.at)}
        </small>
      </div>
      <b className="body-word" data-state={bodyState(w)}>
        {w.word}
      </b>
      {signals.length > 0 && (
        <ul className="body-signals">
          {signals.map((k) => {
            const v = w.signals![k]!;
            return (
              <li key={k} data-state={TONE[v]}>
                <span>{SIGNAL_LABELS[k]}</span>
                <b>{signalWord(k, v)}</b>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
