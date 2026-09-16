"use client";

import { SCENARIO } from "@/lib/scenario";
import type { IconId } from "@/lib/apps";

const CAL_DAY = SCENARIO.today.toUpperCase();
const CAL_NUM = SCENARIO.dates[SCENARIO.today];

export function Glyph({ id }: { id: IconId }) {
  switch (id) {
    case "offshift":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="11" width="4" height="10" rx="1.2" fill="#fff" opacity=".85" />
          <rect x="10" y="6" width="4" height="15" rx="1.2" fill="#fff" />
          <rect x="17" y="9" width="4" height="12" rx="1.2" fill="#DAAB56" />
          <rect x="17" y="3" width="4" height="4" rx="1.2" fill="#DAAB56" opacity=".55" />
        </svg>
      );
    case "pandora":
    case "pandora-manager":
      return <span>P</span>;
    case "mcd":
    case "mcd-manager":
      return <span>M</span>;
    case "myuq":
      return <span>UQ</span>;
    case "calendar":
      return (
        <>
          <span className="cal-top">{CAL_DAY}</span>
          <span className="cal-num">{CAL_NUM}</span>
        </>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="7.5" stroke="#fff" strokeWidth="3" strokeDasharray="3 2.2" />
          <circle cx="12" cy="12" r="3" fill="#fff" />
        </svg>
      );
    case "translink":
      return <span>T</span>;
  }
}

export default function AppIcon({ id, size = "lg", badge }: { id: IconId; size?: "lg" | "sm" | "xs"; badge?: number }) {
  const manager = id.endsWith("-manager");
  return (
    <span className={`icon ${id} ${size === "lg" ? "" : size}`} aria-hidden="true">
      <Glyph id={id} />
      {manager && <span className="mgr">MGR</span>}
      {badge ? <span className="badge">{badge}</span> : null}
    </span>
  );
}
