"use client";

import { useState } from "react";
import { DAYS, DAY_NAMES } from "@/lib/logic";
import { useStore } from "@/lib/store";
import { isClock } from "@/lib/time";
import type { Day } from "@/lib/types";

/** The worker's own settings: their name, the days they keep clear, and what counts as a late finish. */
export default function SettingsForm({ onDone }: { onDone: () => void }) {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const [opened] = useState(() => ({ name: settings.name, restDays: DAYS.filter((d) => settings.restDays.includes(d)), lateFinish: settings.lateFinish }));
  const [name, setName] = useState(settings.name);
  const [restDays, setRestDays] = useState<Day[]>(settings.restDays);
  const [lateFinish, setLateFinish] = useState(settings.lateFinish);

  function save(e: React.FormEvent) {
    e.preventDefault();
    // Only what changed here, so a name the team set meanwhile isn't put back.
    const next = { name: name.trim().slice(0, 30), restDays: DAYS.filter((d) => restDays.includes(d)), lateFinish: isClock(lateFinish) ? lateFinish : settings.lateFinish };
    const patch = Object.fromEntries(Object.entries(next).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(opened[k as keyof typeof opened])));
    if (Object.keys(patch).length) update(patch);
    onDone();
  }

  return (
    <form className="item-form" onSubmit={save}>
      <div className="field full">
        <label htmlFor="set-name">Your first name (optional)</label>
        <input id="set-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoComplete="given-name" placeholder="Used in greetings" />
      </div>
      <div className="field full">
        <span className="label">Days you keep clear</span>
        <div className="seg days" role="group" aria-label="Days you keep clear">
          {DAYS.map((d) => {
            const on = restDays.includes(d);
            return (
              <button type="button" key={d} aria-pressed={on} className={on ? "on" : ""} onClick={() => setRestDays((r) => (on ? r.filter((x) => x !== d) : [...r, d]))} aria-label={DAY_NAMES[d]}>
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <div className="field">
        <label htmlFor="set-late">A late finish is after</label>
        <input id="set-late" type="time" value={lateFinish} onChange={(e) => setLateFinish(e.target.value)} />
      </div>
      <div className="form-actions full">
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn">
          Save
        </button>
      </div>
    </form>
  );
}
