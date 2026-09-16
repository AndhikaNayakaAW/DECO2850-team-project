"use client";

import { useRef, useState } from "react";
import AppIcon from "./AppIcon";
import StatusBar from "./StatusBar";
import { SCENARIO } from "@/lib/scenario";
import { DAY_NAMES } from "@/lib/logic";
import { useStore } from "@/lib/store";

export default function LockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const clock = useStore((s) => s.clock);
  const notifications = useStore((s) => s.notifications);
  const openApp = useStore((s) => s.openApp);
  const dismiss = useStore((s) => s.dismissNotification);
  const [unlocking, setUnlocking] = useState(false);
  const [dy, setDy] = useState(0);
  const start = useRef<number | null>(null);

  function unlock(after?: () => void) {
    if (unlocking) return;
    setUnlocking(true);
    setTimeout(() => {
      onUnlocked();
      after?.();
    }, 420);
  }

  function onDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    start.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (start.current === null) return;
    const d = Math.min(0, e.clientY - start.current);
    setDy(d);
    if (d < -90) {
      start.current = null;
      setDy(0);
      unlock();
    }
  }
  function onUp() {
    start.current = null;
    setDy(0);
  }

  const shown = notifications.slice(0, 3);
  return (
    <div
      className={`layer lock${unlocking ? " unlocking" : ""}`}
      style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="presentation"
    >
      <StatusBar />
      <div className="clock">
        <div className="date">
          {DAY_NAMES[SCENARIO.today]} {SCENARIO.dates[SCENARIO.today]} {SCENARIO.month}
        </div>
        <div className="time">{clock}</div>
      </div>
      {shown.length ? (
        <div className="notifs">
          {shown.map((n, i) => (
            <button
              key={n.id}
              className="notif"
              style={{ "--i": i } as React.CSSProperties}
              onClick={() => {
                dismiss(n.id);
                unlock(() => openApp(n.app === "offshift" ? "offshift" : n.app, n.offerId && n.app === "offshift" ? { screen: "offer", offerId: n.offerId } : undefined));
              }}
            >
              <AppIcon id={n.app} size="sm" />
              <div>
                <div className="t">
                  {n.title}
                  <span>{n.at}</span>
                </div>
                <p>{n.body}</p>
              </div>
            </button>
          ))}
          {notifications.length > 3 && <div className="quiet" style={{ textAlign: "center" }}>{notifications.length - 3} more</div>}
        </div>
      ) : (
        <p className="empty">No notifications</p>
      )}
      <button className="hint" style={{ border: 0, background: "transparent", cursor: "pointer", color: "inherit" }} onClick={() => unlock()}>
        <b>Swipe up to unlock</b>
      </button>
      <div className="quick" aria-hidden="true">
        <i>🔦</i>
        <i>📷</i>
      </div>
    </div>
  );
}
