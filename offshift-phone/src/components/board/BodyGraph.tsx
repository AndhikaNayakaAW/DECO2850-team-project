"use client";

import { clock12 } from "@/lib/logic";
import { LOAD_COLOUR, LOAD_WORDS, SHIFT_SIGNALS, SIGNAL_NAME, blockTimes, describeSignal, timeMarks } from "@/lib/shift-body";
import type { Load, Shift, ShiftSignal } from "@/lib/types";

/**
 * A shift's readings as a bar per 15 minutes, taller and darker for more, with its times underneath. Length is read
 * more accurately than shade (Munzner, 2014), so the levels separate at a glance. No reading is a short hatched stub.
 * The sentence stays in the label for screen readers only.
 */
export function BodyGraph({ levels, signal, shift, label = false }: { levels: (Load | null)[]; signal: ShiftSignal; shift: Pick<Shift, "start" | "end">; label?: boolean }) {
  const times = blockTimes(shift);
  const marks = timeMarks(shift);
  return (
    <span className="body-graph" role="img" aria-label={`${SIGNAL_NAME[signal]}: ${describeSignal(levels, signal) ?? "no reading"}`}>
      {label && <b>{SIGNAL_NAME[signal]}</b>}
      <span className="graph">
        <span className="bars">
          {levels.map((v, i) => (
            <i
              key={i}
              className={v === null ? "none" : undefined}
              style={v === null ? undefined : { height: `${(v + 1) * 25}%`, background: LOAD_COLOUR[v] }}
              title={`${clock12(times[i].start)}–${clock12(times[i].end)}: ${v === null ? "no reading" : LOAD_WORDS[signal][v]}`}
            />
          ))}
        </span>
        <span className="axis" aria-hidden="true">
          {marks.map((m, i) => (
            <span key={i} className={i === 0 ? "first" : i === marks.length - 1 ? "last" : undefined} style={{ left: `${m.at * 100}%` }}>
              {m.label}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

/** Both readings for a finished shift, one graph each. */
export function ShiftBodyChart({ shift }: { shift: Pick<Shift, "start" | "end" | "body"> }) {
  if (!shift.body) return null;
  const body = shift.body;
  return (
    <section className="shift-body" aria-label="Your watch during this shift">
      {SHIFT_SIGNALS.map((sig) => (
        <BodyGraph key={sig} levels={body[sig]} signal={sig} shift={shift} label />
      ))}
    </section>
  );
}
