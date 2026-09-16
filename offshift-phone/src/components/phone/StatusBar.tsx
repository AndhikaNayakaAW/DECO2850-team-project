"use client";

import { useStore } from "@/lib/store";

export default function StatusBar({ tone = "default" }: { tone?: "default" | "light" }) {
  const clock = useStore((s) => s.clock);
  return (
    <div className="status" style={tone === "light" ? { color: "#fff" } : undefined}>
      <span className="left">
        <span className="mono">{clock}</span>
        <span className="sync" title="Synced" aria-label="Synced">
          <i />
        </span>
      </span>
      <span className="right">
        <span className="bars" aria-hidden="true">
          <i style={{ height: 4 }} />
          <i style={{ height: 6 }} />
          <i style={{ height: 8 }} />
          <i style={{ height: 10 }} />
        </span>
        <span className="batt" aria-hidden="true" />
      </span>
    </div>
  );
}
