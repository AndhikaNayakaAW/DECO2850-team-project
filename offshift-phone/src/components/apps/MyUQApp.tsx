"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import AppIcon from "@/components/phone/AppIcon";
import { DAYS, DAY_NAMES, clock12 } from "@/lib/logic";
import { PERSON, SCENARIO } from "@/lib/scenario";
import { useStore } from "@/lib/store";

export default function MyUQApp() {
  const uni = useStore((s) => s.uni);
  const dismiss = useStore((s) => s.dismissNotification);
  const notifIds = useStore(useShallow((s) => s.notifications.filter((n) => n.app === "myuq").map((n) => n.id)));
  useEffect(() => {
    notifIds.forEach((id) => dismiss(id));
  }, [notifIds, dismiss]);
  const classes = uni.filter((u) => u.type !== "due");
  const dues = uni.filter((u) => u.type === "due");
  return (
    <div className="app">
      <div className="app-head tint myuq">
        <AppIcon id="myuq" size="sm" />
        <div>
          <h1>myUQ</h1>
          <span className="sub">
            {PERSON.full} · {PERSON.studentId}
          </span>
        </div>
      </div>
      <div className="app-body">
        <div className="card" style={{ background: "var(--uq-soft)", borderColor: "transparent" }}>
          <div className="k">Semester 2 · Week 8</div>
          <b>{SCENARIO.weekLabel}</b>
        </div>
        <div className="card">
          <div className="k">Timetable</div>
          <div className="tt">
            {DAYS.slice(0, 5).map((d) => {
              const items = classes.filter((c) => c.day === d);
              return (
                <div key={d} className="tt-day">
                  <div className={`d${d === SCENARIO.today ? " today" : ""}`}>{d}</div>
                  <div>
                    {items.length === 0 && <div className="none">No classes</div>}
                    {items.map((c) => (
                      <div key={c.id} className="cls">
                        <b>
                          {c.course} {c.title}
                        </b>
                        <span>
                          {clock12(c.start)}–{clock12(c.end)} · {c.room}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="k">Assessment</div>
          <div className="tt">
            {dues.map((d) => (
              <div key={d.id} className="tt-day">
                <div className="d">{d.day}</div>
                <div className="cls due">
                  <b>
                    {d.course} · {d.title}
                  </b>
                  <span>
                    {DAY_NAMES[d.day]} {SCENARIO.dates[d.day]} {SCENARIO.monthShort}, {clock12(d.start)}
                  </span>
                </div>
              </div>
            ))}
            <div className="tt-day">
              <div className="d">Nov</div>
              <div className="cls due">
                <b>Exam block</b>
                <span>2–13 November</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card list">
          <div className="lr">
            <span>Enrolment</span>
            <b>Full-time · international</b>
          </div>
          <div className="lr">
            <span>Work rights</span>
            <b>48 h a fortnight</b>
          </div>
          <div className="lr">
            <span>Library</span>
            <b>Nothing due</b>
          </div>
        </div>
      </div>
    </div>
  );
}
