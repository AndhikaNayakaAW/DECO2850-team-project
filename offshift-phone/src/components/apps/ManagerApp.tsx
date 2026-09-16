"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import AppIcon from "@/components/phone/AppIcon";
import { DAYS, DAY_NAMES, minutes, range12 } from "@/lib/logic";
import { COLLEAGUE_ROSTER, EMPLOYERS, SCENARIO } from "@/lib/scenario";
import { useStore } from "@/lib/store";
import type { Day, EmployerId, OfferStatus } from "@/lib/types";

const STATUS: Record<OfferStatus, { label: string; tone: string }> = {
  pending: { label: "Waiting on Dinda", tone: "lamp" },
  deferred: { label: "Waiting on Dinda", tone: "lamp" },
  accepted: { label: "Accepted", tone: "ok" },
  declined: { label: "Declined", tone: "" },
  countered: { label: "Counter-offer", tone: "warn" },
  "alt-confirmed": { label: "Confirmed", tone: "ok" },
  "swap-requested": { label: "Swap requested", tone: "warn" },
  swapped: { label: "Reassigned", tone: "ok" },
};

const DEFAULT_OFFER: Record<EmployerId, { day: Day; start: string; end: string; note: string }> = {
  pandora: { day: "Fri", start: "16:00", end: "21:00", note: "Hi Dinda, could you stay on for the Friday close 4–9? Tom's asked to leave early." },
  mcd: { day: "Sun", start: "10:00", end: "16:00", note: "Hey Dinda, we're short Sunday 10–4. Any chance you can come in?" },
};

export default function ManagerApp({ employer, embedded = false }: { employer: EmployerId; embedded?: boolean }) {
  const emp = EMPLOYERS[employer];
  const app: `${EmployerId}-manager` = `${employer}-manager`;
  const [tab, setTab] = useState<"roster" | "offers" | "chat">("offers");
  const [form, setForm] = useState(DEFAULT_OFFER[employer]);
  const [publish, setPublish] = useState<{ day: Day; start: string; end: string }>({ day: "Wed", start: "16:00", end: "20:00" });
  const [text, setText] = useState("");
  const shifts = useStore(useShallow((s) => s.shifts.filter((x) => x.employer === employer)));
  const offers = useStore(useShallow((s) => s.offers.filter((x) => x.employer === employer)));
  const messages = useStore(useShallow((s) => s.messages.filter((x) => x.employer === employer)));
  const sendOffer = useStore((s) => s.sendOffer);
  const publishShift = useStore((s) => s.publishShift);
  const resolve = useStore((s) => s.managerResolve);
  const sendMessage = useStore((s) => s.sendMessage);
  const showToast = useStore((s) => s.showToast);
  const staff = COLLEAGUE_ROSTER[employer];

  function submitOffer(e: React.FormEvent) {
    e.preventDefault();
    if (minutes(form.end) <= minutes(form.start)) {
      showToast("Finish time must be after start time.");
      return;
    }
    sendOffer(employer, form);
    setTab("offers");
  }

  return (
    <div className="app">
      {!embedded && (
        <div className={`app-head tint ${app}`}>
          <AppIcon id={app} size="sm" />
          <div>
            <h1>{emp.managerApp}</h1>
            <span className="sub">
              {emp.site} · {emp.manager.name}, shift manager
            </span>
          </div>
        </div>
      )}
      <div className={`app-tabs ${app}`}>
        <button aria-selected={tab === "offers"} onClick={() => setTab("offers")}>
          Ask Dinda
        </button>
        <button aria-selected={tab === "roster"} onClick={() => setTab("roster")}>
          Roster
        </button>
        <button aria-selected={tab === "chat"} onClick={() => setTab("chat")}>
          Chat
        </button>
      </div>

      {tab === "offers" && (
        <div className="app-body">
          <form className="card" onSubmit={submitOffer}>
            <div className="k">Offer a shift to Dinda</div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor={`${app}-day`}>Day</label>
                <select id={`${app}-day`} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value as Day })}>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {DAY_NAMES[d]} {SCENARIO.dates[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>&nbsp;</label>
                <span className="quiet" style={{ paddingTop: 9 }}>
                  ${employer === "pandora" ? EMPLOYERS.pandora.rate : EMPLOYERS.mcd.rate}/h{form.day === "Sat" ? " · Sat rate" : ""}
                </span>
              </div>
              <div className="field">
                <label htmlFor={`${app}-start`}>Start</label>
                <input id={`${app}-start`} type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor={`${app}-end`}>Finish</label>
                <input id={`${app}-end`} type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required />
              </div>
              <div className="field full">
                <label htmlFor={`${app}-note`}>Message</label>
                <textarea id={`${app}-note`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} required />
              </div>
            </div>
            <button className={`btn tint ${app}`} type="submit">
              Send to Dinda
            </button>
          </form>

          <div className="card">
            <div className="k">Asks this week</div>
            {offers.length === 0 && <p className="quiet">Nothing sent yet.</p>}
            {offers
              .slice()
              .reverse()
              .map((o) => {
                const reply = messages.filter((m) => m.offerId === o.id && m.from === "dinda").slice(-1)[0];
                return (
                  <div key={o.id} className="offer-card" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                    <div className="oh">
                      <b>
                        {DAY_NAMES[o.day]} {range12(o.start, o.end)}
                      </b>
                      <span className={`status-pill ${STATUS[o.status].tone}`}>{STATUS[o.status].label}</span>
                    </div>
                    <span className="quiet">Sent {o.sentAt}</span>
                    {reply && <div className="reply">“{reply.text}”</div>}
                    {o.status === "countered" && o.alt && (
                      <button className={`btn small tint ${app}`} onClick={() => resolve(o.id, "confirm-alt")}>
                        Confirm {o.alt.label}
                        {o.alt.nextWeek ? " (next week)" : ""}
                      </button>
                    )}
                    {o.status === "swap-requested" && (
                      <button className={`btn small tint ${app}`} onClick={() => resolve(o.id, "approve-swap")}>
                        Approve swap with {o.colleague}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {tab === "roster" && (
        <div className="app-body">
          <div className="card">
            <div className="k">
              {SCENARIO.weekLabel} · {emp.site}
            </div>
            <div className="roster" role="table" aria-label="Weekly roster">
              <div />
              {DAYS.map((d) => (
                <div key={d} className={`rh${d === SCENARIO.today ? " today" : ""}`}>
                  {d}
                </div>
              ))}
              <div className="rn">Dinda</div>
              {DAYS.map((d) => {
                const mine = shifts.filter((s) => s.day === d);
                const ask = offers.find((o) => o.day === d && (o.status === "pending" || o.status === "deferred"));
                if (mine.length) return <div key={d} className={`rc on ${app}`}>{mine.map((s) => `${parseInt(s.start)}–${parseInt(s.end)}`).join(" ")}</div>;
                if (ask) return <div key={d} className="rc ask">{`${parseInt(ask.start)}–${parseInt(ask.end)}?`}</div>;
                return <div key={d} className="rc">·</div>;
              })}
              {Object.entries(staff).map(([name, week]) => (
                <div key={name} style={{ display: "contents" }}>
                  <div className="rn">{name}</div>
                  {DAYS.map((d) => {
                    const sick = offers.some((o) => o.day === d && new RegExp(`${name}'s sick`, "i").test(o.note));
                    const swapped = offers.find((o) => o.status === "swapped" && o.colleague === name && o.day === d);
                    if (swapped) return <div key={d} className={`rc on ${app}`}>{`${parseInt(swapped.start)}–${parseInt(swapped.end)}`}</div>;
                    const v = week[d];
                    return (
                      <div key={d} className={`rc${v ? ` on ${app}` : ""}${sick ? " sick" : ""}`}>
                        {v || "·"}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <form
            className="card"
            onSubmit={(e) => {
              e.preventDefault();
              if (minutes(publish.end) <= minutes(publish.start)) {
                showToast("Finish time must be after start time.");
                return;
              }
              publishShift(employer, publish);
            }}
          >
            <div className="k">Publish a roster change for Dinda</div>
            <div className="form-grid">
              <div className="field full">
                <label htmlFor={`${app}-pday`}>Day</label>
                <select id={`${app}-pday`} value={publish.day} onChange={(e) => setPublish({ ...publish, day: e.target.value as Day })}>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {DAY_NAMES[d]} {SCENARIO.dates[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${app}-pstart`}>Start</label>
                <input id={`${app}-pstart`} type="time" value={publish.start} onChange={(e) => setPublish({ ...publish, start: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor={`${app}-pend`}>Finish</label>
                <input id={`${app}-pend`} type="time" value={publish.end} onChange={(e) => setPublish({ ...publish, end: e.target.value })} />
              </div>
            </div>
            <button className="btn neutral" type="submit">
              Publish to roster
            </button>
          </form>
        </div>
      )}

      {tab === "chat" && (
        <>
          <div className="app-body">
            <div className="chat">
              {messages.map((m) => (
                <div key={m.id} className={`bubble ${m.from === "manager" ? `me ${app}` : m.from === "system" ? "sys" : "them"}`}>
                  {m.from === "dinda" && (
                    <span className="at" style={{ marginTop: 0, marginBottom: 2 }}>
                      Dinda
                    </span>
                  )}
                  {m.text}
                  <span className="at">{m.at}</span>
                </div>
              ))}
            </div>
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              sendMessage(employer, "manager", text.trim());
              setText("");
            }}
          >
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message Dinda" aria-label="Message" />
            <button className={app} type="submit">
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
