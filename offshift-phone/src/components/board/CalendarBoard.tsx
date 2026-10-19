"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Assistant from "./Assistant";
import AskPanel from "./AskPanel";
import BodyCard from "./BodyCard";
import Immersive from "./Immersive";
import ItemForm, { type ItemKindChoice, type ItemTarget, type Removed } from "./ItemForm";
import SettingsForm from "./SettingsForm";
import { Sheet } from "./Sheet";
import Week3D, { type DropTarget } from "./Week3D";
import { buildWeek, clashes, waitingAsks } from "@/lib/checks";
import { DAY_NAMES, clock12, dayIndex } from "@/lib/logic";
import { useStore } from "@/lib/store";
import { useSynced } from "@/lib/sync";
import { useNow } from "@/lib/use-now";
import { addDays, daysBetween, longDate, weekDates, weekLabel, weekStart, weekdayName } from "@/lib/time";
import type { DateKey, Day, DayItem, Decision } from "@/lib/types";

const KINDS: { kind: string; label: string; cls: string }[] = [
  { kind: "shift", label: "Work", cls: "shift" },
  { kind: "uni", label: "Classes", cls: "uni" },
  { kind: "personal", label: "Plans", cls: "personal" },
  { kind: "offer", label: "Asks", cls: "offer" },
];

type SheetState = { type: "item"; target: ItemTarget } | { type: "settings" } | null;
type Undo = Removed | { kind: "moved"; id: string; title: string; from: DateKey; to: DateKey };

function kindOf(it: DayItem): ItemKindChoice | null {
  if (it.kind === "shift") return "shift";
  if (it.kind === "personal") return "personal";
  if (it.kind === "uni") return "uni";
  if (it.kind === "due") return "due";
  return null;
}

/** The main screen: the week in 3D, the selected day or ask beside it. */
export default function CalendarBoard() {
  const hydrated = useSynced();
  const state = useStore();
  const now = useNow(state.settings.timeZone);
  const removeShift = useStore((s) => s.removeShift);
  const removeUni = useStore((s) => s.removeUni);
  const removePersonal = useStore((s) => s.removePersonal);
  const updatePersonal = useStore((s) => s.updatePersonal);
  const restore = useStore((s) => s.restore);
  const fireReminders = useStore((s) => s.fireReminders);
  const clearToast = useStore((s) => s.clearToast);

  const [anchor, setAnchor] = useState<DateKey | null>(null);
  const [picked, setPicked] = useState<DateKey | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  /** An answer to open the ask with, e.g. "decline" after the worker flicks the ask away. Changing `askKey` reopens it. */
  const [askChoice, setAskChoice] = useState<Exclude<Decision, "later"> | null>(null);
  const [askKey, setAskKey] = useState(0);
  const sideRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<SheetState>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [immersive, setImmersive] = useState(false);
  const immersiveRef = useRef(false);
  immersiveRef.current = immersive;

  const weekAnchor = anchor ?? now.date;
  const dates = useMemo(() => weekDates(weekAnchor), [weekAnchor]);
  const selected = picked && dates.includes(picked) ? picked : dates.includes(now.date) ? now.date : dates[0];
  const dateOfDay = useCallback((day: Day) => dates[dayIndex(day)], [dates]);

  useEffect(() => {
    // exhibit mode: /calendar?immersive=1 opens straight into the immersive week
    try {
      if (new URLSearchParams(window.location.search).get("immersive") === "1") setImmersive(true);
    } catch {}
  }, []);

  useEffect(() => {
    // Only a screen someone can see shows a reminder; a hidden tab would use it up unseen.
    const tick = () => {
      if (document.visibilityState === "visible") fireReminders();
    };
    tick();
    const t = setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [fireReminders]);

  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(clearToast, state.toastMs || 4500);
    return () => clearTimeout(t);
  }, [state.toast, state.toastKey, state.toastMs, clearToast]);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 7000);
    return () => clearTimeout(t);
  }, [undo]);

  const week = useMemo(() => buildWeek(state, weekAnchor, now), [state.shifts, state.uni, state.personal, state.offers, state.settings, weekAnchor, now.date]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(() => week.map((d) => ({ ...d, items: d.items.filter((it) => !hidden.has(it.kind === "due" ? "uni" : it.kind)) })), [week, hidden]);
  const view = week.find((d) => d.date === selected)!;
  const clash = useMemo(() => clashes(state), [state.shifts, state.personal, state.uni]); // eslint-disable-line react-hooks/exhaustive-deps
  const pending = waitingAsks(state.offers);
  const offer = offerId ? state.offers.find((o) => o.id === offerId) : null;
  const weekIsEmpty = week.every((d) => d.items.every((it) => it.kind === "rest"));
  const nothingAtAll = !state.shifts.length && !state.uni.length && !state.personal.length;
  const isThisWeek = dates.includes(now.date);

  const goToDate = useCallback(
    (date: DateKey) => {
      setAnchor(weekStart(date) === weekStart(now.date) ? null : date);
      setPicked(date);
    },
    [now.date],
  );

  const openAsk = useCallback(
    (id: string, choice: Exclude<Decision, "later"> | null = null) => {
      const o = useStore.getState().offers.find((x) => x.id === id);
      if (o) goToDate(o.date);
      setOfferId(id);
      setAskChoice(choice);
      setAskKey((k) => k + 1);
      // On a phone the panel sits under the week: bring it into view.
      requestAnimationFrame(() => {
        if (window.matchMedia("(max-width: 700px)").matches) sideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [goToDate],
  );

  function addItem(kind: ItemKindChoice = "shift", date: DateKey = selected) {
    setSheet({ type: "item", target: { kind, date } });
  }

  function editItem(it: DayItem, date: DateKey) {
    if (it.kind === "offer" && it.offerId) return openAsk(it.offerId);
    const kind = kindOf(it);
    if (kind) setSheet({ type: "item", target: { kind, id: it.id, date } });
  }

  function handleRemove({ item }: DropTarget) {
    const s = useStore.getState();
    if (item.kind === "personal") {
      const p = s.personal.find((x) => x.id === item.id);
      if (p) {
        removePersonal(p.id);
        setUndo({ kind: "personal", item: p });
      }
    } else if (item.kind === "shift") {
      const sh = s.shifts.find((x) => x.id === item.id);
      if (sh) {
        removeShift(sh.id);
        setUndo({ kind: "shift", item: sh });
      }
    } else if (item.kind === "uni" || item.kind === "due") {
      const u = s.uni.find((x) => x.id === item.id);
      if (u) {
        removeUni(u.id);
        setUndo({ kind: "uni", item: u });
      }
    } else if (item.kind === "offer" && item.offerId) {
      const o = s.offers.find((x) => x.id === item.offerId);
      // Nothing reaches a manager from a gesture: the drafted "no" opens for the worker to read and send.
      if (o && (o.status === "pending" || o.status === "deferred")) openAsk(o.id, "decline");
    }
  }

  function handleMove({ item }: DropTarget, to: Day) {
    if (item.kind !== "personal") return;
    const p = useStore.getState().personal.find((x) => x.id === item.id);
    const date = dateOfDay(to);
    if (!p || p.date === date) return;
    updatePersonal(p.id, { date });
    setUndo({ kind: "moved", id: p.id, title: p.title, from: p.date, to: date });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (immersiveRef.current || sheet) return;
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === "function" && target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") goToDate(addDays(selected, 1));
      if (e.key === "ArrowLeft") goToDate(addDays(selected, -1));
      if (e.key === "Escape") setOfferId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToDate, selected, sheet]);

  function exitImmersive() {
    setImmersive(false);
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("immersive")) {
        params.delete("immersive");
        window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`);
      }
    } catch {}
  }

  if (!hydrated)
    return (
      <div className="board board-wait" aria-busy="true">
        <p className="quiet">Opening your week…</p>
      </div>
    );

  const name = state.settings.name.trim();
  const all = view.items.filter((it) => it.kind !== "rest");
  const list = all.filter((it) => !hidden.has(it.kind === "due" ? "uni" : it.kind));
  const away = daysBetween(now.date, view.date);
  const relative = away === 0 ? "Today" : away === 1 ? "Tomorrow" : away === -1 ? "Yesterday" : away > 1 ? `In ${away} days` : `${-away} days ago`;
  const year = now.date.slice(0, 4);
  const weekYear = dates[0].slice(0, 4) !== year || dates[6].slice(0, 4) !== year ? ` ${dates[6].slice(0, 4)}` : "";

  return (
    <div className="board">
      <header className="board-head">
        <div className="board-title">
          <div className="eyebrow">
            {isThisWeek ? "This week" : weekStart(weekAnchor) < weekStart(now.date) ? "Earlier" : "Coming up"} · {weekLabel(weekAnchor)}
            {weekYear}
          </div>
          <h1>{name ? `${name}'s week` : "Your week"}</h1>
        </div>
        <div className="week-nav" role="group" aria-label="Week">
          <button className="btn ghost small" onClick={() => goToDate(addDays(weekStart(weekAnchor), -7))} aria-label="Previous week">
            ‹
          </button>
          <button className="btn ghost small" onClick={() => goToDate(now.date)} disabled={isThisWeek && selected === now.date}>
            Today
          </button>
          <button className="btn ghost small" onClick={() => goToDate(addDays(weekStart(weekAnchor), 7))} aria-label="Next week">
            ›
          </button>
        </div>
        <div className="board-legend" role="group" aria-label="Show">
          {KINDS.map((k) => (
            <button
              key={k.kind}
              className={`lg ${k.cls}`}
              aria-pressed={!hidden.has(k.kind)}
              onClick={() =>
                setHidden((h) => {
                  const n = new Set(h);
                  if (n.has(k.kind)) n.delete(k.kind);
                  else n.add(k.kind);
                  return n;
                })
              }
            >
              <i />
              {k.label}
            </button>
          ))}
        </div>
        <div className="board-actions">
          {pending.length > 0 && (
            <button className="status-pill lamp big" onClick={() => openAsk(pending[0].id)}>
              {pending.length} ask{pending.length > 1 ? "s" : ""}
            </button>
          )}
          <button className="btn" onClick={() => addItem()}>
            + Add
          </button>
          <Link className="btn neutral" href={`/calendar?view=day&date=${selected}`}>
            Reflect
          </Link>
          <button className="btn neutral" onClick={() => setImmersive(true)}>
            Immersive
          </button>
          <button className="btn ghost icon" onClick={() => setSheet({ type: "settings" })} aria-label="Settings">
            ⚙
          </button>
        </div>
      </header>

      {immersive && (
        <Immersive
          onExit={exitImmersive}
          weekAnchor={weekAnchor}
          now={now}
          onOpenAsk={(id) => {
            exitImmersive();
            openAsk(id);
          }}
        />
      )}

      <div className="board-main" hidden={immersive}>
        <div className="stage-wrap-3d">
          <Week3D
            className="big"
            height="100%"
            detail
            days={days}
            selectedDay={view.day}
            onDayTap={(d) => {
              setPicked(dateOfDay(d));
              setOfferId(null);
            }}
            onOfferTap={openAsk}
            onRemove={handleRemove}
            onMove={handleMove}
            editable
            hint="hold a block to pick it up · move plans between days · bin to remove · pinch to zoom"
          />
          {weekIsEmpty && (
            <div className="empty-week" role="region" aria-label="Get started">
              <h2>{nothingAtAll ? "Start with this week." : "Nothing on this week."}</h2>
              <p>{nothingAtAll ? "Add your shifts, classes and plans. Offshift keeps the week in view when a shift ask comes in." : "Add something, or go back to the week with your plans in it."}</p>
              <div className="row-actions">
                <button className="btn" onClick={() => addItem("shift")}>
                  Add a shift
                </button>
                <button className="btn neutral" onClick={() => addItem("uni")}>
                  Add a class
                </button>
                <button className="btn neutral" onClick={() => addItem("personal")}>
                  Add a plan
                </button>
              </div>
            </div>
          )}
        </div>
        <aside className="board-side" aria-label={offer ? "Ask" : "Day"} ref={sideRef}>
          {offer ? (
            <AskPanel key={askKey} offerId={offer.id} now={now} initialChoice={askChoice} onClose={() => setOfferId(null)} />
          ) : (
            <>
              <div className="side-head">
                <div>
                  <div className="eyebrow">{relative}</div>
                  <h2>
                    {longDate(view.date)}
                    {view.date.slice(0, 4) !== year ? ` ${view.date.slice(0, 4)}` : ""}
                  </h2>
                </div>
                <div className="day-nav">
                  <button onClick={() => goToDate(addDays(selected, -1))} aria-label="Previous day">
                    ‹
                  </button>
                  <button onClick={() => goToDate(addDays(selected, 1))} aria-label="Next day">
                    ›
                  </button>
                </div>
              </div>
              {view.today && <BodyCard />}
              {view.rest && all.length > 0 && <p className="rest-note">{DAY_NAMES[view.day]} is a rest day you set aside.</p>}
              <div className="cal-list">
                {list.length === 0 && all.length === 0 && <p className="quiet">{view.rest ? "A rest day you keep clear." : "Nothing on."}</p>}
                {all.length > list.length && (
                  <p className="quiet">
                    {all.length - list.length} hidden by the filters above.
                  </p>
                )}
                {list.map((it) => (
                  <ListRow key={it.id} it={it} clash={clash[it.id]} onOpen={() => editItem(it, view.date)} />
                ))}
              </div>
              <button className="btn ghost add-day" onClick={() => addItem("shift", view.date)}>
                + Add to {DAY_NAMES[view.day]}
              </button>
              <div className="cal-week board-strip" role="tablist" aria-label="Days">
                {week.map((d) => (
                  <button key={d.date} role="tab" aria-current={d.today ? "date" : undefined} aria-selected={d.date === selected} onClick={() => setPicked(d.date)}>
                    <small>{d.day}</small>
                    <b>{d.dayNum}</b>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      <Assistant onShowDay={(date) => goToDate(date)} onShowOffer={(id) => (id ? openAsk(id) : setOfferId(null))} onOpenAsk={(id, decision) => openAsk(id, decision)} />

      {undo && (
        <div className="undo" role="status">
          <span>{undo.kind === "moved" ? `Moved ${undo.title} to ${weekdayName(undo.to)}` : `Removed ${"workplace" in undo.item ? `${undo.item.workplace} shift` : undo.item.title}`}</span>
          <button
            onClick={() => {
              if (undo.kind === "moved") updatePersonal(undo.id, { date: undo.from });
              else restore(undo.kind, undo.item);
              setUndo(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
      {state.toast && !undo && (
        <div className="toast" role="status" key={state.toastKey}>
          {state.toast}
        </div>
      )}
      {sheet?.type === "item" && (
        <Sheet title={sheet.target.id ? "Change" : "Add to your week"} onClose={() => setSheet(null)}>
          <ItemForm
            target={sheet.target}
            now={now}
            onDone={(saved) => {
              setSheet(null);
              if (saved) goToDate(saved);
            }}
            onRemoved={(r) => setUndo(r)}
          />
        </Sheet>
      )}
      {sheet?.type === "settings" && (
        <Sheet title="Settings" onClose={() => setSheet(null)}>
          <SettingsForm onDone={() => setSheet(null)} />
        </Sheet>
      )}
    </div>
  );
}

function ListRow({ it, clash, onOpen }: { it: DayItem; clash?: string; onOpen: () => void }) {
  const cls = it.kind === "shift" && (it.workplaceIndex ?? 0) % 2 === 1 ? "mcd" : it.kind;
  const time = it.kind === "due" ? `Due\n${clock12(it.start)}` : `${clock12(it.start)}\n${clock12(it.end)}`;
  return (
    <button className={`cal-ev ${cls}`} onClick={onOpen} aria-label={`${it.label}, ${it.kind === "due" ? `due ${clock12(it.start)}` : `${clock12(it.start)} to ${clock12(it.end)}`}${it.kind === "offer" ? ". Open the ask" : ". Change it"}`}>
      <span className="tm">{time}</span>
      <span className="ev-body">
        <b>{it.label}</b>
        <span className="src">{it.kind === "offer" ? "Ask · open it" : it.status || it.source}</span>
        {it.warn && <span className="warn-tag">{it.warn}</span>}
        {clash && <span className="clash">Clashes with {clash}</span>}
      </span>
    </button>
  );
}

