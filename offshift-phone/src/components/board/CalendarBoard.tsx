"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Week3D, { type DropTarget } from "@/components/apps/offshift/Week3D";
import Assistant from "./Assistant";
import Immersive from "./Immersive";
import { PlanForm, Sheet } from "@/components/phone/Sheet";
import { buildDays, clashes, dayListWithTravel, draftFor, impactTiles, offerChecks, offerWhen, replyDraft } from "@/lib/checks";
import { DAYS, DAY_NAMES, clock12, dayIndex, range12 } from "@/lib/logic";
import { EMPLOYERS, PERSON, SCENARIO } from "@/lib/scenario";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/sync";
import type { Day, DayItem, ItemKind, OfferStatus, PersonalEvent, Shift, UniEvent } from "@/lib/types";

type Removed = { kind: "shift" | "uni" | "personal"; item: Shift | UniEvent | PersonalEvent; label: string } | { kind: "offer"; label: string };

const KINDS: { kind: ItemKind | "mcd"; label: string; cls: string }[] = [
  { kind: "shift", label: "Pandora", cls: "shift" },
  { kind: "mcd", label: "McDonald's", cls: "mcd" },
  { kind: "uni", label: "Uni", cls: "uni" },
  { kind: "personal", label: "Plans", cls: "personal" },
  { kind: "offer", label: "Offers", cls: "offer" },
];

const STATUS: Record<OfferStatus, string> = {
  pending: "Waiting on Dinda",
  deferred: "Deciding later",
  accepted: "Taken",
  declined: "Declined",
  countered: "Another time offered",
  "alt-confirmed": "Confirmed",
  "swap-requested": "Swap requested",
  swapped: "Swapped",
};

export default function CalendarBoard() {
  const hydrated = useHydrated();
  const state = useStore();
  const removePersonal = useStore((s) => s.removePersonal);
  const removeShift = useStore((s) => s.removeShift);
  const removeUni = useStore((s) => s.removeUni);
  const movePersonal = useStore((s) => s.movePersonal);
  const restore = useStore((s) => s.restore);
  const respond = useStore((s) => s.respondToOffer);
  const resetDemo = useStore((s) => s.resetDemo);
  const [undo, setUndo] = useState<Removed | null>(null);
  const [immersive, setImmersive] = useState(false);
  const immersiveRef = useRef(false);
  immersiveRef.current = immersive;
  useEffect(() => {
    // exhibit mode: /calendar?immersive=1 opens straight into the immersive week
    try {
      if (new URLSearchParams(window.location.search).get("immersive") === "1") setImmersive(true);
    } catch {}
  }, []);
  const [day, setDay] = useState<Day>(SCENARIO.today);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState(false);

  const allDays = useMemo(() => buildDays(state), [state.shifts, state.uni, state.personal, state.offers, state.settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(
    () =>
      allDays.map((d) => ({
        ...d,
        items: d.items.filter((it) => {
          const key = it.kind === "shift" && it.employer === "mcd" ? "mcd" : it.kind;
          return !hidden.has(key);
        }),
      })),
    [allDays, hidden],
  );
  const view = allDays.find((d) => d.day === day)!;
  const list = dayListWithTravel(view, state);
  const clash = clashes(state);
  const offer = offerId ? state.offers.find((o) => o.id === offerId) : null;
  const pending = state.offers.filter((o) => o.status === "pending" || o.status === "deferred");
  const lastSync = state.sync[state.sync.length - 1];

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

  function handleRemove({ item }: DropTarget) {
    const s = useStore.getState();
    if (item.kind === "personal") {
      const p = s.personal.find((x) => x.id === item.id);
      if (p) {
        removePersonal(p.id);
        setUndo({ kind: "personal", item: p, label: p.title });
      }
    } else if (item.kind === "shift") {
      const sh = s.shifts.find((x) => x.id === item.id);
      if (sh) {
        removeShift(sh.id);
        setUndo({ kind: "shift", item: sh, label: item.label });
      }
    } else if (item.kind === "uni") {
      const u = s.uni.find((x) => x.id === item.id);
      if (u) {
        removeUni(u.id);
        setUndo({ kind: "uni", item: u, label: item.label });
      }
    } else if (item.kind === "offer" && item.offerId) {
      const o = s.offers.find((x) => x.id === item.offerId);
      if (o && (o.status === "pending" || o.status === "deferred")) {
        respond(o.id, "decline", draftFor(replyDraft(o, "decline", s), "plain"));
        setUndo({ kind: "offer", label: `Declined ${o.from}` });
        if (offerId === o.id) setOfferId(null);
      }
    }
  }

  function handleMove({ item }: DropTarget, to: Day) {
    if (item.kind === "personal") movePersonal(item.id, to);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (immersiveRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === "function" && target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") setDay((d) => DAYS[Math.min(6, dayIndex(d) + 1)]);
      if (e.key === "ArrowLeft") setDay((d) => DAYS[Math.max(0, dayIndex(d) - 1)]);
      if (e.key === "Escape") setOfferId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated) return <div className="board" />;

  return (
    <div className="board">
      <header className="board-head">
        <div>
          <div className="eyebrow">
            {SCENARIO.weekLabel} · synced {lastSync?.at}
          </div>
          <h1>{PERSON.name}'s week</h1>
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
          <span className="lg rest static">
            <i />
            Rest
          </span>
        </div>
        <div className="board-actions">
          {pending.length > 0 && (
            <button className="status-pill lamp big" onClick={() => { setOfferId(pending[0].id); setDay(pending[0].day); }}>
              {pending.length} ask{pending.length > 1 ? "s" : ""}
            </button>
          )}
          <button className="btn" onClick={() => setSheet(true)}>
            + Plan
          </button>
          <button className="btn neutral" onClick={() => setImmersive(true)}>
            Enter immersive view
          </button>
          <button
            className="btn ghost small"
            onClick={() => {
              if (confirm("Reset the scenario? Jess's ask comes back and every change is cleared on all devices.")) {
                resetDemo();
                setOfferId(null);
                setDay(SCENARIO.today);
              }
            }}
          >
            Reset
          </button>
        </div>
      </header>
      {immersive && <Immersive onExit={() => setImmersive(false)} />}
      <div className="board-main" hidden={immersive}>
        <Week3D
          className="big"
          height="100%"
          detail
          days={days}
          selectedDay={day}
          onDayTap={(d) => {
            setDay(d);
            setOfferId(null);
          }}
          onOfferTap={(id) => {
            const o = state.offers.find((x) => x.id === id);
            if (o) setDay(o.day);
            setOfferId(id);
          }}
          onRemove={handleRemove}
          onMove={handleMove}
          editable
          hint="drag a block · flick or bin to remove · pinch to zoom"
        />
        <aside className="board-side">
          {offer ? (
            <OfferPanel offerId={offer.id} onClose={() => setOfferId(null)} />
          ) : (
            <>
              <div className="side-head">
                <div>
                  <div className="eyebrow">{view.today ? "Today" : DAY_NAMES[day]}</div>
                  <h2>
                    {DAY_NAMES[day]} {view.date}
                  </h2>
                </div>
                <div className="day-nav">
                  <button onClick={() => setDay(DAYS[Math.max(0, dayIndex(day) - 1)])} aria-label="Previous day" disabled={dayIndex(day) === 0}>
                    ‹
                  </button>
                  <button onClick={() => setDay(DAYS[Math.min(6, dayIndex(day) + 1)])} aria-label="Next day" disabled={dayIndex(day) === 6}>
                    ›
                  </button>
                </div>
              </div>
              <div className="cal-list">
                {list.length === 0 && <p className="quiet">{view.rest ? "Rest. Booked like a shift." : "Nothing on."}</p>}
                {list.map((it) => (
                  <ListRow key={it.id} it={it} clash={clash[it.id]} onOffer={() => it.offerId && setOfferId(it.offerId)} onRemove={it.kind === "personal" ? () => removePersonal(it.id) : undefined} />
                ))}
              </div>
              <div className="cal-week board-strip" role="tablist" aria-label="Days">
                {allDays.map((d) => (
                  <button key={d.day} role="tab" aria-current={d.today} aria-selected={d.day === day} onClick={() => setDay(d.day)}>
                    <small>{d.day}</small>
                    <b>{d.date}</b>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
      <Assistant onShowDay={setDay} onShowOffer={setOfferId} />
      {undo && (
        <div className="undo" role="status">
          <span>{undo.kind === "offer" ? undo.label : `Removed ${undo.label}`}</span>
          {undo.kind !== "offer" && (
            <button
              onClick={() => {
                restore(undo.kind, undo.item);
                setUndo(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
      {sheet && (
        <Sheet title="New plan" onClose={() => setSheet(false)}>
          <PlanForm day={day} onDone={() => setSheet(false)} />
        </Sheet>
      )}
    </div>
  );
}

function ListRow({ it, clash, onOffer, onRemove }: { it: DayItem & { travelFor?: string }; clash?: string; onOffer: () => void; onRemove?: () => void }) {
  const cls = it.travelFor ? "travel" : it.kind === "shift" && it.employer === "mcd" ? "mcd" : it.kind;
  return (
    <div className={`cal-ev ${cls}`}>
      <div className="tm">{it.kind === "due" ? clock12(it.start) : it.kind === "rest" ? "All day" : `${clock12(it.start, false)}\n${clock12(it.end)}`}</div>
      <div>
        <b>{it.kind === "rest" ? "Protected rest" : it.label}</b>
        <span className="src">{it.source}</span>
        {clash && <span className="clash">Clashes with {clash}</span>}
        {it.kind === "offer" && (
          <button className="btn small ghost" onClick={onOffer}>
            Open
          </button>
        )}
        {onRemove && (
          <button className="btn small ghost" style={{ padding: "2px 8px" }} onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function OfferPanel({ offerId, onClose }: { offerId: string; onClose: () => void }) {
  const state = useStore();
  const offer = state.offers.find((o) => o.id === offerId);
  if (!offer) return null;
  const emp = EMPLOYERS[offer.employer];
  const checks = offerChecks(offer, state);
  const tiles = impactTiles(offer, state);
  const open = offer.status === "pending" || offer.status === "deferred";
  return (
    <div className="offer-panel">
      <div className="side-head">
        <div>
          <div className="eyebrow">
            {offer.from} · {emp.name} · {offer.sentAt}
          </div>
          <h2>
            Cover {offerWhen(offer)}, {range12(offer.start, offer.end)}?
          </h2>
        </div>
        <button className="x" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="card flat">
        <div className="ask-from">
          <span className={`avatar ${offer.employer}`} aria-hidden="true">
            {emp.manager.initial}
          </span>
          <p style={{ fontSize: 14 }}>“{offer.note}”</p>
        </div>
      </div>
      {checks.map((c) => (
        <div key={c.key} className={`check ${c.state}`}>
          <div className="ck">{c.key}</div>
          <div>{c.text}</div>
        </div>
      ))}
      <div className="impact-panel">
        {tiles.map((t) => (
          <div key={t.key} className="impact-tile" data-state={t.state}>
            <b>{t.title}</b>
            <strong>{t.value}</strong>
            <small>{t.detail}</small>
          </div>
        ))}
      </div>
      <div className={`status-pill big ${open ? "lamp" : offer.status === "declined" ? "" : "ok"}`}>{STATUS[offer.status]}</div>
    </div>
  );
}
