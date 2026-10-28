"use client";

import { BodyGraph } from "./BodyGraph";
import { EFFORT_COLOUR } from "@/lib/effort";
import { clock12 } from "@/lib/logic";
import type { DayItem, ShiftSignal } from "@/lib/types";

/** One thing on the selected day, with its readings under a shift. Without `onOpen` it is read only. */
export function ListRow({ it, clash, signal, onOpen }: { it: DayItem; clash?: string; signal: ShiftSignal; onOpen?: () => void }) {
  const cls = it.kind === "shift" && (it.workplaceIndex ?? 0) % 2 === 1 ? "mcd" : it.kind;
  const time = it.kind === "due" ? `Due\n${clock12(it.start)}` : `${clock12(it.start)}\n${clock12(it.end)}`;
  const when = it.kind === "due" ? `due ${clock12(it.start)}` : `${clock12(it.start)} to ${clock12(it.end)}`;
  const content = (
    <>
      <span className="tm">{time}</span>
      <span className="ev-body">
        <b>{it.label}</b>
        <span className="src">{onOpen && it.kind === "offer" ? (it.later ? "Kept for later · press to decide" : "Ask · open it") : it.status || it.source}</span>
        {it.body && (
          <span className="ev-body-reading">
            <BodyGraph levels={it.body[signal]} signal={signal} shift={it} />
          </span>
        )}
        {it.warn && <span className="warn-tag">{it.warn}</span>}
        {clash && <span className="clash">Clashes with {clash}</span>}
      </span>
    </>
  );
  const className = `cal-ev ${cls}${it.later ? " later" : ""}${onOpen ? "" : " read-only"}`;
  const style = it.effort ? { borderLeftColor: EFFORT_COLOUR[it.effort] } : undefined;
  if (!onOpen) return <div className={className} style={style}>{content}</div>;
  return (
    <button className={className} style={style} onClick={onOpen} aria-label={`${it.label}, ${when}${it.kind === "offer" ? ". Open the ask" : ". Change it"}`}>
      {content}
    </button>
  );
}
