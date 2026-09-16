"use client";

import { useRef, useState } from "react";
import AppIcon from "./AppIcon";
import StatusBar from "./StatusBar";
import ManagerApp from "@/components/apps/ManagerApp";
import { APPS, PAGE_ONE } from "@/lib/apps";
import { bodyTile, buildDays, moneySummary } from "@/lib/checks";
import { DAY_NAMES, clock12, range12 } from "@/lib/logic";
import { EMPLOYERS, EMPLOYER_IDS, SCENARIO } from "@/lib/scenario";
import { selectPendingOffers, useStore } from "@/lib/store";
import type { AppId, EmployerId } from "@/lib/types";

function IconButton({ id }: { id: AppId }) {
  const openApp = useStore((s) => s.openApp);
  const unread = useStore((s) => s.notifications.filter((n) => n.app === id).length);
  return (
    <button className="app-btn" onClick={() => openApp(id)} aria-label={APPS[id].label}>
      <AppIcon id={id} badge={unread || undefined} />
      <span className="lbl">{APPS[id].label}</span>
    </button>
  );
}

function OffshiftWidget() {
  const openApp = useStore((s) => s.openApp);
  const state = useStore();
  const body = bodyTile(state);
  const money = moneySummary(state);
  const first = selectPendingOffers(state)[0];
  return (
    <button className="widget" onClick={() => openApp("offshift", first ? { screen: "offer", offerId: first.id } : { screen: "week" })}>
      <div className="w-head">
        <AppIcon id="offshift" size="xs" /> Offshift <span>{DAY_NAMES[SCENARIO.today]}</span>
      </div>
      <div className="w-tiles">
        <div className="w-tile">
          <div className="k">Body</div>
          <div className={`v ${body.state}`}>{body.label}</div>
        </div>
        <div className="w-tile">
          <div className="k">Money</div>
          <div className={`v ${money.coveredBy ? "ok" : "warn"}`}>{money.coveredBy ? `Covered by ${money.coveredBy}` : `$${money.short} short`}</div>
        </div>
      </div>
      {first ? (
        <div className="w-ask">
          <i />
          <span>
            <b>{first.from}</b> · {first.day === SCENARIO.today ? "tonight" : DAY_NAMES[first.day]} {range12(first.start, first.end)} →
          </span>
        </div>
      ) : (
        <div className="w-ask" style={{ color: "var(--ink-2)" }}>
          <span>Nothing waiting on you.</span>
        </div>
      )}
    </button>
  );
}

function TodayWidget() {
  const state = useStore();
  const openApp = useStore((s) => s.openApp);
  const today = buildDays(state).find((d) => d.today)!;
  const items = today.items.filter((it) => it.kind !== "rest").slice(0, 4);
  return (
    <button className="widget today" onClick={() => openApp("offshift", { screen: "week" })}>
      <div className="w-head">
        <AppIcon id="calendar" size="xs" /> Today <span>{items.length ? `${items.length} things` : "free"}</span>
      </div>
      <div className="w-today">
        {items.map((it) => (
          <div key={it.id} className={`w-item ${it.kind} ${it.employer || ""}`}>
            <i />
            <span className="mono">{it.kind === "due" ? clock12(it.start) : `${clock12(it.start, false)}–${clock12(it.end)}`}</span>
            <span className="lbl">{it.label}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

function ManagerPage() {
  const [emp, setEmp] = useState<EmployerId>("pandora");
  return (
    <div className="mgr-page">
      <div className="seg" role="tablist" aria-label="Manager">
        {EMPLOYER_IDS.map((id) => (
          <button key={id} role="tab" aria-selected={emp === id} onClick={() => setEmp(id)}>
            <span className={`avatar ${id}`} style={{ width: 22, height: 22, fontSize: 11 }}>
              {EMPLOYERS[id].manager.initial}
            </span>
            {EMPLOYERS[id].name}
          </button>
        ))}
      </div>
      <ManagerApp key={emp} employer={emp} embedded />
    </div>
  );
}

const PAGE_LABELS = ["Apps", "Manager"];

export default function HomeScreen() {
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; w: number; axis: "x" | "y" | null } | null>(null);

  function onDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".stage, input, textarea, select, .no-swipe")) return;
    drag.current = { x: e.clientX, y: e.clientY, w: (e.currentTarget as HTMLElement).clientWidth, axis: null };
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis === "x") {
        setDragging(true);
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
      }
    }
    if (d.axis !== "x") return;
    const clamped = (page === 0 && dx > 0) || (page === 1 && dx < 0) ? dx * 0.3 : dx;
    setDragX(clamped);
  }
  function onUp() {
    const d = drag.current;
    if (d && d.axis === "x") {
      if (dragX < -d.w * 0.18) setPage(page + 1);
      else if (dragX > d.w * 0.18) setPage(page - 1);
    }
    drag.current = null;
    setDragging(false);
    setDragX(0);
  }

  return (
    <div className="layer home" aria-label="Home screen">
      <StatusBar />
      <div
        className="pages-clip"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={(e) => {
          if ((e.target as HTMLElement).closest("input, textarea, select")) return;
          if (e.key === "ArrowRight") setPage(page + 1);
          if (e.key === "ArrowLeft") setPage(page - 1);
        }}
        tabIndex={0}
      >
        <div className={`pages${dragging ? " dragging" : ""}`} style={{ transform: `translateX(calc(${-page * 100}% + ${dragX}px))` }}>
          <section className="page" aria-label="Apps" aria-hidden={page !== 0}>
            <div className="grid">
              <OffshiftWidget />
              {PAGE_ONE.map((id) => (
                <IconButton key={id} id={id} />
              ))}
              <TodayWidget />
            </div>
          </section>
          <section className="page fill" aria-label="Manager" aria-hidden={page !== 1}>
            <ManagerPage />
          </section>
        </div>
      </div>
      <div className="dots" role="tablist" aria-label="Pages">
        {PAGE_LABELS.map((label, i) => (
          <button key={label} role="tab" aria-current={page === i} aria-label={label} onClick={() => setPage(i)} />
        ))}
      </div>
    </div>
  );
}
