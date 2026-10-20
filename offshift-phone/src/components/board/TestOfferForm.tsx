"use client";

import { useEffect, useRef, useState } from "react";
import type { AskInput } from "@/lib/actions";
import { defaultTestOffer, submitTestOffer } from "@/lib/test-offer";
import type { Now } from "@/lib/time";
import type { DateKey } from "@/lib/types";

/** A small manager simulator, available without leaving the worker's calendar. */
export default function TestOfferForm({ selected, now, waiting, onSent, onCancel }: {
  selected: DateKey;
  now: Pick<Now, "date" | "time">;
  waiting: number;
  onSent: (date: DateKey) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(() => defaultTestOffer(selected, now));
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function set(patch: Partial<AskInput>) {
    setProblem(null);
    setForm((current) => ({ ...current, ...patch }));
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setProblem(null);
    try {
      await submitTestOffer(form, now);
      if (mounted.current) onSent(form.date);
    } catch (error) {
      if (mounted.current) setProblem(error instanceof Error ? error.message : "Could not confirm delivery. Check the calendar before retrying.");
    } finally {
      sending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <form className="item-form" onSubmit={send} noValidate aria-busy={busy}>
      <p className="form-note full">Play the manager and send a test offer to this calendar and your Garmin. It becomes a shift only after you accept.</p>
      {waiting > 0 && <p className="form-note full">The watch shows one waiting offer at a time. Answer earlier offers first to reach this one.</p>}
      <label className="field">
        <span>From</span>
        <input value={form.from} onChange={(event) => set({ from: event.target.value })} maxLength={40} disabled={busy} required />
      </label>
      <label className="field">
        <span>Workplace</span>
        <input value={form.workplace} onChange={(event) => set({ workplace: event.target.value })} maxLength={80} disabled={busy} required />
      </label>
      <label className="field full">
        <span>Date</span>
        <input type="date" min={now.date} value={form.date} onChange={(event) => set({ date: event.target.value })} disabled={busy} required />
      </label>
      <label className="field">
        <span>Start</span>
        <input type="time" value={form.start} onChange={(event) => set({ start: event.target.value })} disabled={busy} required />
      </label>
      <label className="field">
        <span>Finish</span>
        <input type="time" value={form.end} onChange={(event) => set({ end: event.target.value })} disabled={busy} required />
      </label>
      {form.end < form.start && <p className="form-note full">Finishes the following day.</p>}
      <label className="field full">
        <span>Message (optional)</span>
        <textarea value={form.note} onChange={(event) => set({ note: event.target.value })} maxLength={1000} rows={3} disabled={busy} />
      </label>
      {problem && <p className="form-problem full" role="alert">{problem}</p>}
      <div className="form-actions full">
        <button className="btn ghost" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
        <span className="spacer" />
        <button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Send test offer"}</button>
      </div>
    </form>
  );
}
