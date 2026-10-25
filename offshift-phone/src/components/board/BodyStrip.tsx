"use client";

import { clock12 } from "@/lib/logic";
import { LOAD_COLOUR, LOAD_WORDS, SHIFT_SIGNALS, SIGNAL_NAME, SIGNAL_SOURCE, blockTimes, describeSignal } from "@/lib/shift-body";
import type { Load, Shift, ShiftSignal } from "@/lib/types";

/**
 * A shift's readings as a row of 15-minute cells, darker for more, hatched where the watch had no reading.
 * The 2D view of the ribbon on the 3D week: easier to read and compare than depth (Munzner, 2014).
 */
export function BodyStrip({ levels, signal, shift, label = false }: { levels: (Load | null)[]; signal: ShiftSignal; shift?: Pick<Shift, "start" | "end">; label?: boolean }) {
  const times = shift ? blockTimes(shift) : null;
  return (
    <span className="body-strip" role="img" aria-label={`${SIGNAL_NAME[signal]}: ${describeSignal(levels, signal) ?? "no reading"}`}>
      {label && <b>{SIGNAL_NAME[signal]}</b>}
      <span className="cells">
        {levels.map((v, i) => (
          <i
            key={i}
            className={v === null ? "none" : undefined}
            style={v === null ? undefined : { background: LOAD_COLOUR[v] }}
            title={`${times ? `${clock12(times[i].start)}–${clock12(times[i].end)}: ` : ""}${v === null ? "no reading" : LOAD_WORDS[signal][v]}`}
          />
        ))}
      </span>
    </span>
  );
}

/** Both readings for a finished shift, with its times along the bottom, a sentence each and where they come from. */
export function ShiftBodyChart({ shift }: { shift: Pick<Shift, "start" | "end" | "body"> }) {
  if (!shift.body) return null;
  const body = shift.body;
  return (
    <section className="shift-body" aria-label="Your watch during this shift">
      {SHIFT_SIGNALS.map((sig) => (
        <div key={sig} className="shift-body-row">
          <BodyStrip levels={body[sig]} signal={sig} shift={shift} label />
          <p>{describeSignal(body[sig], sig)}</p>
          <small>
            {SIGNAL_SOURCE[sig]}. {LOAD_WORDS[sig].join(", ")}, lightest to darkest.
          </small>
        </div>
      ))}
      <div className="shift-body-axis" aria-hidden="true">
        <span>{clock12(shift.start)}</span>
        <span>{clock12(shift.end)}</span>
      </div>
    </section>
  );
}
