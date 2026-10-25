"use client";

import { useMemo, useState } from "react";
import { ShiftBodyChart } from "./BodyStrip";
import { workplacesOf } from "@/lib/checks";
import { useStore } from "@/lib/store";
import { minutes } from "@/lib/logic";
import { isClock, isDateKey, type Now } from "@/lib/time";
import { EFFORTS, EFFORT_COLOUR, EFFORT_WORD } from "@/lib/effort";
import type { DateKey, Effort, Importance, PersonalEvent, Shift, UniEvent } from "@/lib/types";

export type ItemKindChoice = "shift" | "uni" | "due" | "personal";

export interface ItemTarget {
  kind: ItemKindChoice;
  id?: string;
  date: DateKey;
  start?: string;
  end?: string;
}

const KIND_LABEL: Record<ItemKindChoice, string> = { shift: "Shift", uni: "Class", due: "Due", personal: "Plan" };
const DEFAULTS: Record<ItemKindChoice, { start: string; end: string }> = {
  shift: { start: "16:00", end: "21:00" },
  uni: { start: "10:00", end: "12:00" },
  due: { start: "23:59", end: "23:59" },
  personal: { start: "18:00", end: "19:00" },
};

export type Removed = { kind: "shift"; item: Shift } | { kind: "uni"; item: UniEvent } | { kind: "personal"; item: PersonalEvent };

/** Add or change a shift, a class, something due, or a plan. */
/** `onDone` gets the saved item's date, so the calendar can show it; nothing when cancelled or deleted. */
export default function ItemForm({ target, now, onDone, onRemoved }: { target: ItemTarget; now: Pick<Now, "date" | "time">; onDone: (saved?: DateKey) => void; onRemoved?: (removed: Removed) => void }) {
  const s = useStore();
  const existing = useMemo(() => {
    if (!target.id) return null;
    if (target.kind === "shift") return s.shifts.find((x) => x.id === target.id) ?? null;
    if (target.kind === "personal") return s.personal.find((x) => x.id === target.id) ?? null;
    return s.uni.find((x) => x.id === target.id) ?? null;
  }, [target, s.shifts, s.personal, s.uni]);
  // Editing stays editing even if the item disappears (deleted on another device): it must never be re-created by Save.
  const editing = !!target.id;
  const gone = editing && !existing;
  const [kind, setKind] = useState<ItemKindChoice>(target.kind);
  const [form, setForm] = useState(() => ({
    title: existing ? ("workplace" in existing ? existing.workplace : existing.title) : "",
    date: existing?.date ?? target.date,
    start: existing?.start ?? target.start ?? DEFAULTS[target.kind].start,
    end: existing?.end ?? target.end ?? DEFAULTS[target.kind].end,
    importance: (existing && "importance" in existing ? existing.importance : undefined) ?? ("flexible" as Importance),
    effort: (existing && "effort" in existing ? existing.effort : undefined) as Effort | undefined,
  }));
  const [problem, setProblem] = useState<string | null>(null);
  const [timesTouched, setTimesTouched] = useState(false);
  const workplaces = workplacesOf(s);
  const set = (patch: Partial<typeof form>) => {
    setProblem(null);
    setForm((f) => ({ ...f, ...patch }));
  };

  function changeKind(next: ItemKindChoice) {
    if (editing) return;
    setKind(next);
    // Times the worker already typed stay; untouched defaults follow the kind.
    if (!timesTouched) set({ start: DEFAULTS[next].start, end: DEFAULTS[next].end });
    else setProblem(null);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (gone) return;
    const title = form.title.trim();
    const end = kind === "due" ? form.start : form.end;
    if (!title) return setProblem(kind === "shift" ? "Where is the shift?" : "Give it a name.");
    if (!isDateKey(form.date)) return setProblem("Pick a date.");
    if (!isClock(form.start) || !isClock(end)) return setProblem("Pick the times.");
    if (kind !== "due" && form.start === end) return setProblem("The finish has to differ from the start.");
    if (kind === "shift") {
      const data = { date: form.date, start: form.start, end, workplace: title };
      if (editing) {
        s.updateShift(existing!.id, data);
        s.setEffort(existing!.id, form.effort ?? null);
      } else s.addShift(data);
    } else if (kind === "personal") {
      const data = { date: form.date, start: form.start, end, title, importance: form.importance };
      if (editing) s.updatePersonal(existing!.id, data);
      else s.addPersonal({ ...data, category: "personal" });
    } else {
      const data = { date: form.date, start: form.start, end, title, type: kind === "due" ? ("due" as const) : ("class" as const) };
      if (editing) s.updateUni(existing!.id, data);
      else s.addUni(data);
    }
    s.showToast(editing ? "Saved." : `${KIND_LABEL[kind]} added.`);
    onDone(form.date);
  }

  function remove() {
    if (!existing) return;
    if (kind === "shift") {
      s.removeShift(existing.id);
      onRemoved?.({ kind: "shift", item: existing as Shift });
    } else if (kind === "personal") {
      s.removePersonal(existing.id);
      onRemoved?.({ kind: "personal", item: existing as PersonalEvent });
    } else {
      s.removeUni(existing.id);
      onRemoved?.({ kind: "uni", item: existing as UniEvent });
    }
    onDone();
  }

  // A shift can be rated once it has finished: an earlier day, or earlier today.
  const endsAt = form.date === now.date && minutes(form.end) > minutes(form.start) ? minutes(form.end) : null;
  const past = kind === "shift" && editing && (form.date < now.date || (endsAt !== null && endsAt <= minutes(now.time)));

  return (
    <form className="item-form" onSubmit={save} noValidate>
      {gone && (
        <p className="form-problem full" role="alert">
          This was deleted on another device.
        </p>
      )}
      <fieldset className="contents" disabled={gone}>
      {!editing && (
        <div className="seg" role="radiogroup" aria-label="What is it?">
          {(Object.keys(KIND_LABEL) as ItemKindChoice[]).map((k) => (
            <button type="button" key={k} role="radio" aria-checked={kind === k} className={kind === k ? "on" : ""} onClick={() => changeKind(k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
      <div className="field full">
        <label htmlFor="item-title">{kind === "shift" ? "Workplace" : kind === "uni" ? "Class" : kind === "due" ? "What's due" : "Plan"}</label>
        <input
          id="item-title"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder={kind === "shift" ? "e.g. Café on George St" : kind === "uni" ? "e.g. Tutorial" : kind === "due" ? "e.g. Essay" : "e.g. Dinner with a friend"}
          list={kind === "shift" ? "workplaces" : undefined}
          autoComplete="off"
          maxLength={60}
        />
        {kind === "shift" && (
          <datalist id="workplaces">
            {workplaces.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
        )}
      </div>
      <div className="field">
        <label htmlFor="item-date">Date</label>
        <input id="item-date" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="item-start">{kind === "due" ? "Due at" : "Starts"}</label>
        <input
          id="item-start"
          type="time"
          value={form.start}
          onChange={(e) => {
            setTimesTouched(true);
            set({ start: e.target.value });
          }}
        />
      </div>
      {kind !== "due" && (
        <div className="field">
          <label htmlFor="item-end">Finishes</label>
          <input
            id="item-end"
            type="time"
            value={form.end}
            onChange={(e) => {
              setTimesTouched(true);
              set({ end: e.target.value });
            }}
          />
        </div>
      )}
      {kind === "personal" && (
        <div className="field full">
          <span className="label">How fixed is it?</span>
          <div className="seg" role="radiogroup" aria-label="How fixed is it?">
            {(["flexible", "important", "protected"] as Importance[]).map((imp) => (
              <button type="button" key={imp} role="radio" aria-checked={form.importance === imp} className={form.importance === imp ? "on" : ""} onClick={() => set({ importance: imp })}>
                {imp === "flexible" ? "Flexible" : imp === "important" ? "Important" : "Protected"}
              </button>
            ))}
          </div>
        </div>
      )}
      {past && existing && "body" in existing && existing.body && (
        <div className="field full">
          <span className="label">Your watch during this shift</span>
          <ShiftBodyChart shift={existing as Shift} />
        </div>
      )}
      {past && (
        <div className="field full">
          <span className="label">How was the work?</span>
          <div className="seg effort" role="radiogroup" aria-label="How was the work?">
            {([undefined, ...EFFORTS] as (Effort | undefined)[]).map((r) => (
              <button type="button" key={r ?? "none"} role="radio" aria-checked={form.effort === r} className={form.effort === r ? "on" : ""} onClick={() => set({ effort: r })}>
                {r && <i className="swatch" style={{ background: EFFORT_COLOUR[r] }} aria-hidden="true" />}
                {r ? EFFORT_WORD[r] : "Not rated"}
              </button>
            ))}
          </div>
        </div>
      )}
      </fieldset>
      {kind !== "due" && !problem && form.end < form.start && <p className="form-note full">Finishes the next morning.</p>}
      {problem && (
        <p className="form-problem full" role="alert">
          {problem}
        </p>
      )}
      <div className="form-actions full">
        {editing && !gone && (
          <button type="button" className="btn ghost danger" onClick={remove}>
            Delete
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={() => onDone()}>
          {gone ? "Close" : "Cancel"}
        </button>
        {!gone && (
          <button type="submit" className="btn">
            {editing ? "Save" : "Add"}
          </button>
        )}
      </div>
    </form>
  );
}
