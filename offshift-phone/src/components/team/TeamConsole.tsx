"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { askProblem } from "@/lib/actions";
import { clock12, range12 } from "@/lib/logic";
import { TEAM_STATUS } from "@/lib/status";
import type { TeamView } from "@/lib/team";
import { DEFAULT_TIME_ZONE, isClock, isDateKey, nowIn, shortDate, whenWord } from "@/lib/time";
import { hidden, wait } from "@/lib/visible";

function ago(iso: string | null, nowMs: number): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 1000));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

type Body = Record<string, unknown>;

/** The team's view, kept fresh while the page is in view. Actions return the new view straight away. */
function useTeam() {
  const [view, setView] = useState<TeamView | null>(null);
  const [online, setOnline] = useState(true);
  const version = useRef(-1);

  const pull = useCallback(async () => {
    try {
      const res = await fetch(`/api/team?since=${version.current}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const j = (await res.json()) as Partial<TeamView> & { version: number; watchSeenAt: string | null };
      setOnline(true);
      // A poll that left before an action answered must not roll the page back.
      if (j.version < version.current) return;
      if (j.asks) {
        version.current = j.version;
        setView(j as TeamView);
      } else setView((v) => (v ? { ...v, watchSeenAt: j.watchSeenAt } : v));
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    (async () => {
      await pull();
      while (!stopped) {
        await wait(2000);
        if (!stopped && !hidden()) await pull();
      }
    })();
    return () => {
      stopped = true;
    };
  }, [pull]);

  const act = useCallback(async (body: Body): Promise<string | null> => {
    try {
      const res = await fetch("/api/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) return j.error ?? "That didn't work. Try again.";
      version.current = j.version;
      setView(j as TeamView);
      setOnline(true);
      return null;
    } catch {
      setOnline(false);
      return "Couldn't reach Offshift. Check the connection and try again.";
    }
  }, []);

  return { view, online, act };
}

/** The research team's page: run the session, play the manager, see replies. Body readings and plans never reach it. */
export default function TeamConsole() {
  const { view, online, act } = useTeam();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const tz = view?.timeZone ?? DEFAULT_TIME_ZONE;
  const today = nowIn(tz, new Date(nowMs)).date;
  const [form, setForm] = useState({ from: "", workplace: "", date: "", start: "16:00", end: "21:00", note: "" });
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  if (!view) {
    return (
      <main className="team" aria-busy="true">
        <p className="quiet">{online ? "Opening the session…" : "Couldn't reach Offshift. Trying again…"}</p>
      </main>
    );
  }

  const date = form.date || today;
  const time = (iso: string) => clock12(nowIn(tz, new Date(iso)).time);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const watchLive = !!view.watchSeenAt && nowMs - Date.parse(view.watchSeenAt) < 6 * 60_000;
  const started = nowIn(tz, new Date(view.sessionStartedAt));

  async function run(body: Body, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    const err = await act(body);
    setBusy(false);
    if (err) alert(err);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const ask = { ...form, date };
    const p = askProblem(ask, nowIn(tz, new Date()));
    setProblem(p);
    setSent(null);
    if (p) return;
    setBusy(true);
    const err = await act({ action: "send-ask", ask });
    setBusy(false);
    if (err) return setProblem(err);
    setSent(`Sent to the worker's calendar and watch: ${shortDate(date)} ${range12(form.start, form.end)} at ${form.workplace.trim()}.`);
    set({ note: "" });
  }

  return (
    <main className="team">
      {!online && (
        <div className="sync-off" role="status">
          Offline. Trying again…
        </div>
      )}
      <header className="team-head">
        <div>
          <div className="eyebrow">Offshift · research team</div>
          <h1>Session</h1>
        </div>
      </header>

      <section className="team-card" aria-labelledby="t-session">
        <h2 id="t-session">This session</h2>
        <p className="quiet">
          Started {shortDate(started.date)} at {clock12(started.time)}.
        </p>
        <form
          className="team-name"
          onSubmit={async (e) => {
            e.preventDefault();
            if (name === null) return;
            await run({ action: "name", name });
            setName(null);
          }}
        >
          <div className="field">
            <label htmlFor="t-name">Worker&apos;s first name (optional)</label>
            <input id="t-name" value={name ?? view.name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="Shown in greetings and drafted replies" autoComplete="off" />
          </div>
          <button className="btn neutral" type="submit" disabled={busy || name === null || name.trim() === view.name}>
            Save name
          </button>
        </form>
        <div className="row-actions">
          <button className="btn" disabled={busy} onClick={() => run({ action: "new-session" }, "Start a new session? The calendar empties on every device, for the next participant.")}>
            New session
          </button>
          <button className="btn ghost" disabled={busy} onClick={() => run({ action: "practice-week" }, "Load the practice week? It replaces everything in the calendar.")}>
            Load practice week
          </button>
        </div>
      </section>

      <section className="team-card" aria-labelledby="t-ask">
        <h2 id="t-ask">Send an ask</h2>
        <p className="quiet">You play the manager. It appears on the worker&apos;s calendar and watch straight away.</p>
        <form className="item-form" onSubmit={send} noValidate>
          <div className="field">
            <label htmlFor="t-from">From (manager&apos;s name)</label>
            <input id="t-from" value={form.from} onChange={(e) => set({ from: e.target.value })} maxLength={30} placeholder="e.g. Alex" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="t-work">Workplace</label>
            <input id="t-work" value={form.workplace} onChange={(e) => set({ workplace: e.target.value })} list="t-workplaces" maxLength={60} placeholder={view.workplaces[0] ?? "e.g. Café on George St"} autoComplete="off" />
            <datalist id="t-workplaces">
              {view.workplaces.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="t-date">Date</label>
            <input id="t-date" type="date" value={date} min={today} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="t-start">Starts</label>
            <input id="t-start" type="time" value={form.start} onChange={(e) => set({ start: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="t-end">Finishes</label>
            <input id="t-end" type="time" value={form.end} onChange={(e) => set({ end: e.target.value })} />
          </div>
          <div className="field full">
            <label htmlFor="t-note">Message (optional)</label>
            <textarea
              id="t-note"
              rows={2}
              value={form.note}
              onChange={(e) => set({ note: e.target.value })}
              maxLength={240}
              placeholder={isDateKey(date) && isClock(form.start) && isClock(form.end) ? `Hi${view.name ? ` ${view.name}` : ""}, any chance you could cover ${whenWord(date, form.start, { date: today })}, ${range12(form.start, form.end)}?` : "A short message"}
            />
          </div>
          {problem && (
            <p className="form-problem full" role="alert">
              {problem}
            </p>
          )}
          {sent && !problem && (
            <p className="form-note full" role="status">
              {sent}
            </p>
          )}
          <div className="form-actions full">
            <span className="spacer" />
            <button type="submit" className="btn" disabled={busy}>
              Send ask
            </button>
          </div>
        </form>
      </section>

      <section className="team-card" aria-labelledby="t-asks">
        <h2 id="t-asks">Asks and replies</h2>
        {view.asks.length === 0 && <p className="quiet">No asks yet this session.</p>}
        <ol className="team-asks">
          {view.asks.map((o) => (
            <li key={o.id} className="team-ask">
              <div className="team-ask-head">
                <b>
                  {o.from} · {o.workplace} · {shortDate(o.date)} {range12(o.start, o.end)}
                </b>
                <span className={`status-pill ${o.status === "pending" || o.status === "deferred" ? "lamp" : o.status === "declined" ? "" : "ok"}`}>{TEAM_STATUS[o.status]}</span>
              </div>
              <ol className="thread">
                {o.thread.map((m) => (
                  <li key={m.id} className={`by-${m.from}`}>
                    <b>
                      {m.from === "team" ? o.from : "Worker"} · {time(m.at)}
                    </b>
                    <span>{m.text}</span>
                  </li>
                ))}
              </ol>
              {o.status === "countered" && o.alt && (
                <button className="btn small" disabled={busy} onClick={() => run({ action: "resolve", offerId: o.id, how: "confirm-alt" })}>
                  Confirm {o.alt}
                </button>
              )}
              {o.status === "countered" && !o.alt && <p className="quiet">The worker asked for another time. Reply to them directly.</p>}
              {o.status === "swap-requested" && (
                <button className="btn small" disabled={busy} onClick={() => run({ action: "resolve", offerId: o.id, how: "approve-swap" })}>
                  Approve the swap
                </button>
              )}
            </li>
          ))}
        </ol>
      </section>

      {view.notes.length > 0 && (
        <section className="team-card" aria-labelledby="t-notes">
          <h2 id="t-notes">Messages from the worker</h2>
          <ol className="team-notes">
            {view.notes
              .slice()
              .reverse()
              .map((m) => (
                <li key={m.id}>
                  <time>{time(m.at)}</time> {m.text}
                </li>
              ))}
          </ol>
        </section>
      )}

      <section className="team-card" aria-labelledby="t-watch">
        <h2 id="t-watch">Watch</h2>
        <p>
          <span className={`dot ${watchLive ? "on" : ""}`} aria-hidden="true" /> {view.watchSeenAt ? `Last checked in ${ago(view.watchSeenAt, nowMs)}` : "Hasn't checked in"}
        </p>
        <p className="quiet">The worker&apos;s plans, body readings and private check-ins never reach this page. You&apos;re playing the employer.</p>
      </section>

      {view.log.length > 0 && (
        <section className="team-card" aria-labelledby="t-log">
          <h2 id="t-log">Recent activity</h2>
          <ol className="team-log">
            {view.log.map((e) => (
              <li key={e.id}>
                <time>{time(e.at)}</time> {e.text}
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
