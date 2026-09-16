"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import AppIcon from "@/components/phone/AppIcon";
import { shiftIncome } from "@/lib/checks";
import { DAYS, DAY_NAMES, dayIndex, money, range12 } from "@/lib/logic";
import { COLLEAGUE_ROSTER, EMPLOYERS, SCENARIO } from "@/lib/scenario";
import { useStore } from "@/lib/store";
import type { EmployerId, OfferStatus } from "@/lib/types";

const STATUS: Record<OfferStatus, string> = {
  pending: "Open",
  deferred: "Open",
  accepted: "Accepted",
  declined: "Declined",
  countered: "Counter-offer sent",
  "alt-confirmed": "Confirmed",
  "swap-requested": "Swap requested",
  swapped: "Reassigned",
};

export default function WorkerApp({ employer }: { employer: EmployerId }) {
  const emp = EMPLOYERS[employer];
  const [tab, setTab] = useState<"roster" | "messages">("roster");
  const [text, setText] = useState("");
  const shifts = useStore(useShallow((s) => s.shifts.filter((x) => x.employer === employer)));
  const offers = useStore(useShallow((s) => s.offers.filter((x) => x.employer === employer)));
  const messages = useStore(useShallow((s) => s.messages.filter((x) => x.employer === employer)));
  const openApp = useStore((s) => s.openApp);
  const sendMessage = useStore((s) => s.sendMessage);
  const respond = useStore((s) => s.respondToOffer);
  const clearFor = useStore((s) => s.dismissNotification);
  const notifIds = useStore(useShallow((s) => s.notifications.filter((n) => n.app === employer).map((n) => n.id)));
  useEffect(() => {
    notifIds.forEach((id) => clearFor(id));
  }, [notifIds, clearFor]);
  const open = offers.filter((o) => o.status === "pending" || o.status === "deferred");
  const total = shifts.reduce((sum, s) => sum + shiftIncome(s), 0);
  const hours = shifts.reduce((sum, s) => sum + (parseInt(s.end) - parseInt(s.start)), 0);
  return (
    <div className="app">
      <div className={`app-head tint ${employer}`}>
        <AppIcon id={employer} size="sm" />
        <div>
          <h1>{emp.workerApp}</h1>
          <span className="sub">
            {emp.site} · Dinda P.
          </span>
        </div>
      </div>
      <div className={`app-tabs ${employer}`}>
        <button aria-selected={tab === "roster"} onClick={() => setTab("roster")}>
          My roster
        </button>
        <button aria-selected={tab === "messages"} onClick={() => setTab("messages")}>
          Messages{open.length ? ` · ${open.length}` : ""}
        </button>
      </div>
      {tab === "roster" ? (
        <div className="app-body">
          {open.map((o) => (
            <div key={o.id} className="card" style={{ borderColor: "var(--lamp)" }}>
              <div className="k">Open shift · from {o.from}</div>
              <b style={{ fontSize: 16 }}>
                {DAY_NAMES[o.day]} {range12(o.start, o.end)}
              </b>
              <p className="quiet">“{o.note}”</p>
              <button className="nudge" onClick={() => openApp("offshift", { screen: "offer", offerId: o.id })}>
                <AppIcon id="offshift" size="xs" />
                <span>
                  <b>Check it in Offshift</b> →
                </span>
              </button>
              <div className="btn-row">
                <button className={`btn small tint ${employer}`} onClick={() => respond(o.id, "accept", `Yes, I can do ${DAY_NAMES[o.day]} ${range12(o.start, o.end)}.`)}>
                  Accept
                </button>
                <button className="btn small neutral" onClick={() => respond(o.id, "decline", `Sorry, I can't do ${DAY_NAMES[o.day]}.`)}>
                  Decline
                </button>
              </div>
            </div>
          ))}
          <div className="card">
            <div className="k">{SCENARIO.weekLabel}</div>
            <div className="bar-k">
              <span>
                {shifts.length} shifts · {hours} h
              </span>
              <span className="mono">{money(total)}</span>
            </div>
          </div>
          <div className="agenda">
            {DAYS.map((d) => {
              const mine = shifts.filter((s) => s.day === d);
              const ask = open.filter((o) => o.day === d);
              return (
                <div key={d} className={`row${d === SCENARIO.today ? " today" : ""}`}>
                  <div className="dn">
                    <b>{d}</b>
                    <span>{SCENARIO.dates[d]}</span>
                  </div>
                  <div className="items">
                    {mine.length === 0 && ask.length === 0 && (
                      <div className="it">
                        <i style={{ background: "var(--line)" }} />
                        <span className="n">Not rostered</span>
                      </div>
                    )}
                    {mine.map((s) => (
                      <div key={s.id} className={`it shift ${employer === "mcd" ? "mcd" : ""}`}>
                        <i />
                        <span className="t">
                          {s.start}–{s.end}
                        </span>
                        <span className="n">
                          {emp.site}
                          {s.note ? ` · ${s.note}` : ""}
                          {s.viaOffer ? " · added today" : ""}
                        </span>
                      </div>
                    ))}
                    {ask.map((o) => (
                      <div key={o.id} className="it offer">
                        <i />
                        <span className="t">
                          {o.start}–{o.end}
                        </span>
                        <span className="n">open · {o.from} asked</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="card">
            <div className="k">Team this week</div>
            <div className="staff">
              {Object.keys(COLLEAGUE_ROSTER[employer]).map((name) => (
                <div key={name} className={`st${/sick/i.test(open.map((o) => o.note).join(" ")) && open.some((o) => new RegExp(`${name}'s sick`, "i").test(o.note)) ? " off" : ""}`}>
                  <span className={`avatar ${employer}`}>{name[0]}</span>
                  {name}
                </div>
              ))}
              <div className="st">
                <span className="avatar dinda">D</span>
                Dinda
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="app-body">
            <div className="chat">
              {messages.map((m) => (
                <div key={m.id} className={`bubble ${m.from === "dinda" ? `me ${employer}` : m.from === "system" ? "sys" : "them"}`}>
                  {m.from === "manager" && (
                    <span className="at" style={{ marginTop: 0, marginBottom: 2 }}>
                      {emp.manager.name}
                    </span>
                  )}
                  {m.text}
                  {m.offerId && m.from === "manager" && (
                    <span className="offer-tag">
                      <span className={`status-pill ${offers.find((o) => o.id === m.offerId)?.status === "pending" ? "lamp" : ""}`}>
                        {STATUS[offers.find((o) => o.id === m.offerId)?.status || "pending"]}
                      </span>
                    </span>
                  )}
                  <span className="at">{m.at}</span>
                </div>
              ))}
            </div>
            {open.length > 0 && (
              <button className="nudge" onClick={() => openApp("offshift", { screen: "offer", offerId: open[0].id })}>
                <AppIcon id="offshift" size="xs" />
                <span>
                  <b>Open in Offshift</b> →
                </span>
              </button>
            )}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              sendMessage(employer, "dinda", text.trim());
              setText("");
            }}
          >
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${emp.manager.name}`} aria-label="Message" />
            <button className={employer} type="submit">
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export function dayOrder(a: string, b: string) {
  return dayIndex(a as never) - dayIndex(b as never);
}
