"use client";

import { useEffect, useState } from "react";
import CalendarExperience from "./CalendarExperience";
import SyncProvider from "@/lib/sync";

const RESET = "/api/demo/state";

/** Starts the demo scenario over: a new session that the page and the demo watch both pick up. */
async function restart(): Promise<boolean> {
  try {
    return (await fetch(RESET, { method: "DELETE", cache: "no-store" })).ok;
  } catch {
    return false;
  }
}

/**
 * The exhibition demo: the normal calendar on the demo's own week. Opening the page starts the scenario fresh
 * (a Cafe shift that just ended under high stress, and an ask from Sam), so the demo watch shows the same thing.
 */
export default function DemoExperience() {
  const [state, setState] = useState<"starting" | "ready" | "failed">("starting");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    // The scenario is reset before the calendar syncs, so it never sends a week left over from an earlier run.
    restart().then((ok) => live && setState(ok ? "ready" : "failed"));
    return () => {
      live = false;
    };
  }, []);

  if (state !== "ready")
    return <p className="board-loading">{state === "failed" ? "Couldn't start the demo. Check the connection and reload." : "Setting up the demo…"}</p>;
  return (
    <div className="demo-on">
      <CalendarExperience />
      <SyncProvider />
      <div className="demo-bar" role="region" aria-label="Exhibition demo">
        <span>
          <b>Exhibition demo</b> · not a real person&apos;s week · the demo watch shows this week
        </span>
        <button
          className="btn small neutral"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await restart();
            setBusy(false);
          }}
        >
          {busy ? "Restarting…" : "Restart"}
        </button>
      </div>
    </div>
  );
}
