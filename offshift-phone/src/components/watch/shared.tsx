"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePrivateWatchStore } from "@/lib/watch-store";
import type { WatchReading } from "@/lib/watch";

export function useWatchHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsub = usePrivateWatchStore.persist.onFinishHydration(() => setReady(true));
    void usePrivateWatchStore.persist.rehydrate();
    if (usePrivateWatchStore.persist.hasHydrated()) setReady(true);
    const sync = (event: StorageEvent) => { if (event.key === "offshift-private-watch-v1" || event.key === null) void usePrivateWatchStore.persist.rehydrate(); };
    window.addEventListener("storage", sync);
    return () => { unsub(); window.removeEventListener("storage", sync); };
  }, []);
  return ready;
}
export function ReflectionNav({ active }: { active: "watch" | "calendar" }) {
  return <header className="reflect-nav">
    <Link href="/" className="reflect-brand"><svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect width="32" height="32" rx="9" fill="currentColor"/><g fill="var(--ground)"><rect x="7" y="15" width="4" height="11" rx="1"/><rect x="14" y="8" width="4" height="18" rx="1"/><rect x="21" y="12" width="4" height="14" rx="1"/></g></svg>Offshift<span className="reflect-prototype">PROTOTYPE</span></Link>
    <nav aria-label="Prototype views"><Link href="/watch" aria-current={active === "watch" ? "page" : undefined}>Watch</Link><Link href="/calendar" aria-current={active === "calendar" ? "page" : undefined}>Daily reflection</Link><Link href="/calendar?view=3d">3D week ↗</Link><Link href="/">Phone ↗</Link></nav>
  </header>;
}
export function Sparkline({ readings }: { readings: WatchReading[] }) {
  if (!readings.length) return <p className="reflect-muted">No readings in this window.</p>;
  const values = readings.map((r) => r.bpm);
  const min = Math.min(...values) - 5, max = Math.max(...values) + 5;
  const times = readings.map((r) => Date.parse(r.recordedAt));
  const span = times[times.length - 1] - times[0];
  const points = readings.map((r, i) => `${span ? 8 + ((times[i] - times[0]) / span) * 284 : 150},${64 - ((r.bpm - min) / (max - min)) * 52}`);
  return <svg className="reflect-spark" viewBox="0 0 300 80" role="img" aria-label={`${readings.length} heart-rate readings, ${Math.min(...values)} to ${Math.max(...values)} beats per minute. Individual values are listed below.`}><path d="M8 65H292" stroke="currentColor" opacity=".15"/><polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>{points.map((p, i) => <circle key={readings[i].id} cx={p.split(",")[0]} cy={p.split(",")[1]} r="3" fill="currentColor"/>)}</svg>;
}
export function DataBadge({ imported, empty = false }: { imported: boolean; empty?: boolean }) {
  return <span className={`reflect-badge ${imported ? "imported" : ""}`}><span aria-hidden="true">●</span> {empty ? "No readings" : imported ? "Imported · unverified" : "Demo data"}</span>;
}
