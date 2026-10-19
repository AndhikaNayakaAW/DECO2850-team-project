"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePrivateWatchStore } from "@/lib/watch-store";
import { readingDate, watchTime } from "@/lib/watch";
import { DEFAULT_TIME_ZONE, nowIn } from "@/lib/time";
import { DataBadge, ReflectionNav, Sparkline, useWatchHydrated } from "./shared";

export default function WatchExperience() {
  const ready = useWatchHydrated();
  const state = usePrivateWatchStore();
  const [screen, setScreen] = useState<"reading" | "reflect">("reading");
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("");
  const [clear, setClear] = useState(false);
  useEffect(() => {
    // A new session clears this browser's private readings, even if the calendar was never opened here.
    let gone = false;
    fetch("/api/state?session=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(async (j: { session?: string | null } | null) => {
        if (gone || !j?.session) return;
        await usePrivateWatchStore.persist.rehydrate();
        usePrivateWatchStore.getState().forSession(j.session);
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, []);
  const latest = ready ? state.readings.at(-1) : undefined;
  const date = latest ? readingDate(latest.recordedAt) : nowIn(DEFAULT_TIME_ZONE).date;
  const imported = latest?.origin === "imported";
  const time = latest ? watchTime(latest.recordedAt) : "—";
  const day = new Date(`${date}T12:00:00+10:00`).toLocaleDateString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short" });

  function importData() {
    try {
      state.importReadings(JSON.parse(json), new Date().toISOString());
      setMessage("Imported to this browser. Open Daily reflection to choose the recording date.");
      setJson("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The file could not be imported."); }
  }
  return <div className="reflect-page watch-page"><ReflectionNav active="watch" />
    <main className="watch-layout">
      <section className="watch-intro">
        <p className="reflect-kicker">A MOMENT TO NOTICE</p>
        <h1>Work is part<br/>of your day.<br/><em>How did it feel?</em></h1>
        <p className="watch-lead">A reading can start a question.<br/>Your experience gives it context.</p>
        <div className="watch-intro-links"><Link className="reflect-primary" href={`/calendar?view=day&date=${date}`}>Reflect on my day <span aria-hidden="true">↗</span></Link><p>Watch → activity → your words → your choice</p></div>
        <div className="watch-purpose"><span>01 / THE PROPOSED FOCUS</span><p>Helping casual workers reflect on how work fits with their energy, rest and other commitments.</p></div>
      </section>
      <section className="watch-showcase" aria-label="Circular watch preview">
        <div className="watch-orbit-label">OFFSHIFT / WATCH PREVIEW</div>
        <div className="watch-hardware"><div className="watch-strap top"/><div className="watch-strap bottom"/><span className="watch-crown"/><div className="watch-bezel"><div className="watch-dial">
          <div className="watch-face-top"><span>OFFSHIFT</span><span>{time}</span></div>
          {screen === "reading" ? <div className="watch-face-body"><p className="watch-face-date">{day}</p><span className="watch-heart" aria-hidden="true">♡</span><div className="watch-bpm">{state.showReadings && latest ? latest.bpm : "—"}<small>bpm</small></div><p className="watch-face-caption">{state.showReadings ? "Last recorded heart rate" : "Readings hidden by you"}</p>{state.showReadings && ready && <Sparkline readings={state.readings.slice(-6)}/>}<DataBadge imported={!!imported} empty={!ready || !latest}/></div> : <div className="watch-face-body watch-face-reflect"><span className="watch-heart" aria-hidden="true">✧</span><h2>How did<br/>your day feel?</h2><p>You know the context.<br/>There is no right answer.</p><Link href={`/calendar?view=day&date=${date}`}>Add my words ↗</Link></div>}
          <div className="watch-face-tabs" role="group" aria-label="Watch screen"><button aria-pressed={screen === "reading"} onClick={() => setScreen("reading")}>Reading</button><button aria-pressed={screen === "reflect"} onClick={() => setScreen("reflect")}>Reflect</button></div>
        </div></div></div>
        <p className="watch-hardware-caption">A browser preview with file import.<br/>Use the calendar for Garmin sync.</p>
      </section>
      <aside className="watch-data-panel">
        <div className="watch-panel-head"><span className="reflect-kicker">YOUR DATA, IN CONTEXT</span><DataBadge imported={!!imported} empty={!ready || !latest}/></div>
        <h2>{imported ? "A file, not a live feed." : "A transparent starting point."}</h2>
        <p>{imported ? "The file's device label is self-reported. This preview cannot verify that it came from a watch." : (latest ? "These are example readings. No watch is connected to this preview." : "No readings yet. Import a watch export below, or load the demo readings to look around.")}</p>
        <dl className="watch-provenance"><div><dt>Reading source</dt><dd>{latest?.source ?? "No readings"}</dd></div><div><dt>Recorded</dt><dd>{latest ? `${readingDate(latest.recordedAt)} · ${time} AEST` : "Not available"}</dd></div><div><dt>{imported ? "Last file import" : "Demo sync"}</dt><dd>{latest ? `${readingDate(latest.receivedAt)} · ${watchTime(latest.receivedAt)} AEST` : "Not synced"}</dd></div><div><dt>Live device connection</dt><dd>Not connected</dd></div></dl>
        <p className="watch-no-inference">Heart rate alone does not tell us that someone is stressed, or that work caused a change.</p>
        <label className="reflect-toggle"><input type="checkbox" checked={state.showReadings} onChange={(e) => state.setShowReadings(e.target.checked)}/> Show heart-rate readings</label>
        <details className="watch-import"><summary>Import a watch export <span aria-hidden="true">＋</span></summary><p>Paste a JSON export in the documented format. Import replaces the current readings and keeps them in this browser only.</p><label htmlFor="watch-json">Watch export JSON</label><textarea id="watch-json" rows={6} value={json} onChange={(e) => setJson(e.target.value)} placeholder={'{"version":1,"device":"Garmin…","readings":[…]}'}/><button className="reflect-primary" disabled={!json.trim()} onClick={importData}>Import to this browser</button><a href="https://github.com/AndhikaNayakaAW/DECO2850-team-project/wiki/Watch-and-Reflection">Export format & integration notes ↗</a></details>
        <div role="status" className="reflect-status">{message}</div>
        <div className="watch-private-actions"><button onClick={() => { state.loadDemo(); setMessage("Demo readings loaded. These are not real watch measurements."); }}>Use demo readings</button><button onClick={() => setClear(true)}>Delete my watch data</button></div>
        {clear && <div className="reflect-confirm" role="group" aria-label="Confirm deletion"><p>Delete readings, reflections and recovery blocks from this browser?</p><button className="reflect-danger" onClick={() => { state.clearPrivateData(); setClear(false); setMessage("Private watch data deleted from this browser."); }}>Delete all private data</button><button onClick={() => setClear(false)}>Keep my data</button></div>}
      </aside>
    </main>
    <footer className="reflect-footer"><span>Small observations. Space for your own meaning.</span><span>Browser only · No employer sharing · No stress score</span></footer>
  </div>;
}
