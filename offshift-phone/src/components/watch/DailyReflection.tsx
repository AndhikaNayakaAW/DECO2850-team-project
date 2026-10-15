"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { buildDays } from "@/lib/checks";
import { DAYS, range12 } from "@/lib/logic";
import { SCENARIO } from "@/lib/scenario";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/sync";
import { readingDate, readingsAround, recoveryPreview, watchTime, type RecoveryPlan } from "@/lib/watch";
import { usePrivateWatchStore } from "@/lib/watch-store";
import { DataBadge, ReflectionNav, Sparkline, useWatchHydrated } from "./shared";

export default function DailyReflection() {
  const params = useSearchParams();
  const requestedDate = params.get("date");
  const [date, setDate] = useState(requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && Number.isFinite(Date.parse(requestedDate)) ? requestedDate : "2026-09-16");
  const hydrated = useHydrated();
  const privateReady = useWatchHydrated();
  const shared = useStore();
  const local = usePrivateWatchStore();
  const [selectedId, setSelectedId] = useState("s-wed");
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState<RecoveryPlan | null>(null);
  const [status, setStatus] = useState("");
  const scenarioDay = DAYS.find((d) => date === `${SCENARIO.year}-09-${String(SCENARIO.dates[d]).padStart(2, "0")}`);
  const items = hydrated && scenarioDay ? buildDays(shared).find((d) => d.day === scenarioDay)!.items.filter((i) => i.kind !== "offer" && i.kind !== "due" && i.kind !== "rest") : [];
  const selected = items.find((i) => i.id === selectedId);
  const key = `${date}:${selectedId}`;
  const readings = privateReady && local.showReadings ? local.readings.filter((r) => readingDate(r.recordedAt) === date) : [];
  const around = selected && privateReady && local.showReadings ? readingsAround(local.readings, { date, start: selected.start, end: selected.end }) : [];
  const plans = privateReady ? Object.entries(local.recoveries).filter(([, p]) => p.date === date) : [];
  const imported = privateReady && local.readings[0]?.origin === "imported";
  const dayTitle = new Date(`${date}T12:00:00+10:00`).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "long", day: "numeric", month: "long" });
  useEffect(() => { setDraft(local.notes[key] || ""); }, [key, local.notes]);
  useEffect(() => { setPreview(null); setStatus(""); }, [key]);
  function changeDate(next: string) { if (!next) return; setDate(next); setSelectedId(""); setPreview(null); }
  function shiftDate(delta: number) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + delta); changeDate(d.toISOString().slice(0, 10)); }

  const entries = [
    ...items.map((item) => ({ key: `activity-${item.id}`, at: item.start, type: "activity" as const, item })),
    ...readings.map((reading) => ({ key: `reading-${reading.id}`, at: watchTime(reading.recordedAt), type: "reading" as const, reading })),
    ...plans.map(([id, plan]) => ({ key: `rest-${id}`, at: plan.start, type: "recovery" as const, plan })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return <div className="reflect-page daily-page"><ReflectionNav active="calendar"/><main className="daily-main">
    <header className="daily-heading"><div><p className="reflect-kicker">NOTICE / REFLECT / CHOOSE</p><h1>A day, in context.</h1><p>The readings are one part of the story. Your words are another.</p></div><Link href="/watch" className="reflect-secondary">Open watch preview ↗</Link></header>
    <div className="daily-toolbar"><div className="daily-date"><button aria-label="Previous day" onClick={() => shiftDate(-1)}>←</button><label><span className="sr">Recording date</span><input type="date" value={date} onChange={(e) => changeDate(e.target.value)}/></label><button aria-label="Next day" onClick={() => shiftDate(1)}>→</button></div><DataBadge imported={!!imported} empty={privateReady && local.readings.length === 0}/><label className="reflect-toggle"><input type="checkbox" checked={local.showReadings} onChange={(e) => local.setShowReadings(e.target.checked)}/> Show readings</label><span className="daily-zone">AEST · Brisbane</span></div>
    <div className="daily-grid"><section className="daily-timeline" aria-label="Daily activity and watch timeline"><div className="daily-timeline-title"><h2>{dayTitle}</h2><p>{date} · Activities use the exhibition calendar.</p></div>
      <div className="daily-legend"><span><i className="work"/>Work</span><span><i className="study"/>Study</span><span><i className="personal"/>Personal</span><span><i className="reading"/>Heart rate</span><span><i className="recovery"/>Protected time</span></div>
      {!hydrated || !privateReady ? <p className="daily-empty">Loading your day…</p> : entries.length ? <ol className="daily-events">{entries.map((entry) => <li key={entry.key} className={`daily-entry ${entry.type}`}><time>{entry.at}</time><div className="daily-entry-dot"/>{entry.type === "activity" ? <button className={`daily-activity ${entry.item.kind} ${selectedId === entry.item.id ? "selected" : ""}`} aria-pressed={selectedId === entry.item.id} onClick={() => setSelectedId(entry.item.id)}><span className="reflect-kicker">{entry.item.kind === "shift" ? "WORK" : entry.item.kind === "uni" ? "STUDY" : "PERSONAL"}</span><strong>{entry.item.label}</strong><span>{range12(entry.item.start, entry.item.end)} <span aria-hidden="true">·</span> {entry.item.source}<span aria-hidden="true" className="daily-activity-arrow">↗</span></span></button> : entry.type === "reading" ? <div className="daily-reading"><span aria-hidden="true">♡</span><strong>{entry.reading.bpm} <small>bpm</small></strong><span>{entry.reading.origin === "demo" ? "Demo watch" : entry.reading.source} · {entry.reading.origin === "demo" ? "example reading" : "imported, unverified"}</span></div> : <div className="daily-recovery"><span className="reflect-kicker">PROTECTED BY YOU / BROWSER ONLY</span><strong>{entry.plan.title}</strong><span>{range12(entry.plan.start, entry.plan.end)}</span></div>}</li>)}</ol> : <p className="daily-empty">No activities or visible readings on this date.</p>}
      {!scenarioDay && <p className="daily-scenario-note">The demo activities are dated 14–20 September 2026. Imported readings stay on their actual recording dates; they are never placed against a different week.</p>}
      <p className="daily-footnote">Timestamped readings are observations. They do not establish stress, tiredness or a cause.</p>
    </section>
    <aside className="daily-detail" aria-label="Activity reflection">
      {selected ? <><p className="reflect-kicker">YOUR EXPERIENCE MATTERS</p><h2>{selected.label}</h2><p className="daily-detail-meta">{range12(selected.start, selected.end)} · {dayTitle}</p><section className="daily-reading-context"><div><h3>Readings around this activity</h3><span>During and 30 min either side</span></div><Sparkline readings={around}/>{around.length > 0 ? <ul className="daily-reading-values">{around.map((r) => <li key={r.id}><time>{watchTime(r.recordedAt)}</time><strong>{r.bpm} bpm</strong><span>{r.origin === "demo" ? "Demo" : "Imported"}</span></li>)}</ul> : <p className="reflect-muted">{local.showReadings ? "No readings recorded in this window." : "You have hidden heart-rate readings."}</p>}</section>
        <form className="daily-checkin" onSubmit={(e) => { e.preventDefault(); local.saveReflection(key, draft); setStatus(draft.trim() ? "Reflection saved in this browser only." : "Reflection cleared."); }}><label htmlFor="activity-reflection">How did this {selected.kind === "shift" ? "shift" : "activity"} feel? <span>Optional</span></label><textarea id="activity-reflection" rows={3} maxLength={500} placeholder="Your words, if you want to add them…" value={draft} onChange={(e) => setDraft(e.target.value)}/><div><span>Only in this browser · {draft.length}/500</span><button className="reflect-secondary" type="submit">Save reflection</button></div></form>
        <section className="daily-next-step"><p className="reflect-kicker">ONE SMALL NEXT STEP</p><h3>Make a little room.</h3><p>If it would help, protect 30 minutes for yourself after this activity. Preview it before changing anything.</p><button className="reflect-primary" onClick={() => setPreview(recoveryPreview({ date, start: selected.start, end: selected.end }))}>Preview recovery time <span aria-hidden="true">＋</span></button>{local.recoveries[key] && <p className="daily-saved-plan">✓ Recovery time is protected in this browser.</p>}</section>
        {preview && <div className="reflect-confirm" role="group" aria-label="Recovery time preview"><strong>Recovery time</strong><p>{preview.date} · {range12(preview.start, preview.end)} AEST</p><p>Starts 30 minutes after the activity. This adds a private block to this daily timeline. Your work roster stays as booked.</p>{items.some((i) => i.id !== selected.id && preview.date === date && i.start < preview.end && preview.start < i.end) && <p className="reflect-warning">This overlaps another activity. Choose another day or cancel if it does not fit.</p>}<div><button className="reflect-primary" onClick={() => { local.confirmRecovery(key, preview); setPreview(null); setStatus("Recovery time protected in your private daily timeline."); }}>Confirm recovery time</button><button className="reflect-secondary" onClick={() => setPreview(null)}>Cancel</button></div></div>}
        <p role="status" className="reflect-status">{status}</p>
      </> : <div className="daily-detail-empty"><span aria-hidden="true">↖</span><h2>Start with an activity.</h2><p>Choose a shift, class or personal plan to see readings around that time and add your own context.</p></div>}
      <div className="daily-privacy"><strong>Yours to keep. Yours to clear.</strong><p>Watch readings, reflections and recovery blocks stay in this browser. They are excluded from the shared demo API and voice assistant. <Link href="/watch">Manage or delete watch data ↗</Link></p></div>
    </aside></div>
  </main><footer className="reflect-footer"><span>A proposed direction to test with workers.</span><span>No stress labels · No automatic roster changes</span></footer></div>;
}
