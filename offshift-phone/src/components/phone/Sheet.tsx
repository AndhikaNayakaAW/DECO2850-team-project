"use client";

import { useState } from "react";
import { DAYS, DAY_NAMES, minutes } from "@/lib/logic";
import { SCENARIO } from "@/lib/scenario";
import { useStore } from "@/lib/store";
import type { Day } from "@/lib/types";

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="sheet" role="dialog" aria-label={title}>
        <i className="grab" aria-hidden="true" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PlanForm({ day: initial, onDone }: { day?: Day; onDone: () => void }) {
  const addPersonal = useStore((s) => s.addPersonal);
  const [form, setForm] = useState({ title: "", day: initial || SCENARIO.today, start: "18:00", end: "20:00" });
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.title.trim() || minutes(form.end) <= minutes(form.start)) return;
        addPersonal({ day: form.day, title: form.title.trim(), start: form.start, end: form.end });
        onDone();
      }}
    >
      <div className="field full">
        <label htmlFor="plan-title">Plan</label>
        <input id="plan-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Gym, study group, a friend visiting" autoFocus required />
      </div>
      <div className="field full">
        <label htmlFor="plan-day">Day</label>
        <select id="plan-day" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value as Day })}>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {DAY_NAMES[d]} {SCENARIO.dates[d]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="plan-start">Start</label>
        <input id="plan-start" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="plan-end">Finish</label>
        <input id="plan-end" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
      </div>
      <button className="btn full" type="submit" style={{ gridColumn: "1/-1" }}>
        Add plan
      </button>
    </form>
  );
}

export default function GlobalSheet() {
  const sheet = useStore((s) => s.sheet);
  const close = useStore((s) => s.closeSheet);
  if (!sheet) return null;
  if (sheet.kind === "plan")
    return (
      <Sheet title="New plan" onClose={close}>
        <PlanForm day={sheet.day} onDone={close} />
      </Sheet>
    );
  return null;
}
