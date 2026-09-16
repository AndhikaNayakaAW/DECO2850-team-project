"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/components/phone/AppIcon";
import { useStore } from "@/lib/store";

type Theme = "light" | "dark";

export default function SettingsApp() {
  const sync = useStore((s) => s.sync);
  const resetDemo = useStore((s) => s.resetDemo);
  const lock = useStore((s) => s.lock);
  const showToast = useStore((s) => s.showToast);
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    try {
      const saved: Theme = localStorage.getItem("offshift-phone-theme") === "dark" ? "dark" : "light";
      setTheme(saved);
    } catch {}
  }, []);
  function applyTheme(t: Theme) {
    setTheme(t);
    if (t === "light") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("offshift-phone-theme", t);
    } catch {}
  }
  return (
    <div className="app">
      <div className="app-head tint settings">
        <AppIcon id="settings" size="sm" />
        <div>
          <h1>Settings</h1>
          <span className="sub">Offshift</span>
        </div>
      </div>
      <div className="app-body">
        <div className="card">
          <div className="k">Connected to Offshift</div>
          <div className="conn">
            {(
              [
                ["pandora", "Pandora Team", "Roster, offers and chat", "in · replies out"],
                ["mcd", "McDonald's Crew", "Roster, offers and chat", "in · replies out"],
                ["myuq", "myUQ", "Timetable, assessment", "in only"],
                ["calendar", "Calendar", "Plans in, shifts out", "both ways"],
                ["translink", "Translink", "Travel times", "in only"],
              ] as const
            ).map(([id, name, what, dir]) => (
              <div key={id} className="cr">
                <AppIcon id={id} size="sm" />
                <div>
                  <b>{name}</b>
                  <span>{what}</span>
                </div>
                <span className="dir">{dir}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="k">Appearance</div>
          <div className="chips">
            {(["light", "dark"] as Theme[]).map((t) => (
              <button key={t} className="chip" aria-pressed={theme === t} onClick={() => applyTheme(t)}>
                {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="k">Prototype</div>
          <div className="btn-row">
            <button className="btn neutral" onClick={lock}>
              Lock phone
            </button>
            <button
              className="btn neutral"
              onClick={() => {
                if (confirm("Reset the prototype?")) {
                  resetDemo();
                  showToast("Reset.");
                }
              }}
            >
              Reset
            </button>
          </div>
        </div>
        <div className="card">
          <div className="k">Activity</div>
          <div className="synclog">
            {sync
              .slice()
              .reverse()
              .map((e) => (
                <div key={e.id} className="se">
                  <span className="at">{e.at}</span>
                  <span>
                    <span className="fromto">
                      <b>{e.from}</b> → {e.to}
                    </span>
                    <br />
                    {e.text}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
