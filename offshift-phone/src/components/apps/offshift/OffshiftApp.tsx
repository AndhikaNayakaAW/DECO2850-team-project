"use client";

import { useEffect, useMemo, useState } from "react";
import Week3D from "./Week3D";
import AppIcon from "@/components/phone/AppIcon";
import { altSlots, bodyTile, buildDays, impactTiles, moneySummary, offerChecks, offerWhen, replyDraft, draftFor, shiftIncome, isClose } from "@/lib/checks";
import { DAYS, DAY_NAMES, absMinutes, clock12, dayIndex, minutes, money, nextDay, range12 } from "@/lib/logic";
import { EMPLOYERS, EMPLOYER_IDS, PERSON, RECOVERY_KIT, SCENARIO } from "@/lib/scenario";
import { useStore, type OffshiftScreen } from "@/lib/store";
import type { BodyRating, Day, OfferStatus } from "@/lib/types";

const STATUS_LABEL: Record<OfferStatus, string> = {
  pending: "Waiting on you",
  deferred: "Deciding later",
  accepted: "Taken",
  declined: "Declined",
  countered: "Another time offered",
  "alt-confirmed": "Confirmed",
  "swap-requested": "Swap requested",
  swapped: "Swapped",
};
const STATUS_TONE: Record<OfferStatus, string> = {
  pending: "lamp",
  deferred: "",
  accepted: "ok",
  declined: "",
  countered: "warn",
  "alt-confirmed": "ok",
  "swap-requested": "warn",
  swapped: "ok",
};

function useRv() {
  let i = 0;
  return () => ({ "--i": i++ } as React.CSSProperties);
}

const NavIcon = ({ name }: { name: "week" | "money" | "checkin" | "me" }) => {
  switch (name) {
    case "week":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      );
    case "money":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v9M14.6 9.6c-.4-1-1.4-1.5-2.6-1.5-1.5 0-2.5.8-2.5 1.9 0 2.6 5.2 1.3 5.2 4 0 1.2-1.1 2-2.7 2-1.4 0-2.5-.6-2.8-1.7" />
        </svg>
      );
    case "checkin":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
          <path d="M5.5 12h3l1.5-3 2 6 1.5-3h4" />
        </svg>
      );
    case "me":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="8.5" r="3.8" />
          <path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5" />
        </svg>
      );
  }
};

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3z" />
  </svg>
);

/* ---------- WEEK ---------- */

function WeekScreen() {
  const state = useStore();
  const setScreen = useStore((s) => s.setOffshiftScreen);
  const openSheet = useStore((s) => s.openSheet);
  const days = useMemo(() => buildDays(state), [state.shifts, state.uni, state.personal, state.offers, state.settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const body = bodyTile(state);
  const m = moneySummary(state);
  const pending = state.offers.filter((o) => o.status === "pending" || o.status === "deferred");
  const decided = state.offers.filter((o) => o.status !== "pending" && o.status !== "deferred");
  const lastSync = state.sync[state.sync.length - 1];
  const rv = useRv();
  return (
    <div className="screen">
      <header className="hero rv" style={rv()}>
        <div className="eyebrow">
          {SCENARIO.weekLabel} · synced {lastSync?.at}
        </div>
        <h1>
          {DAY_NAMES[SCENARIO.today]}, {PERSON.name}.
        </h1>
        <p>
          {state.shifts.length} shifts. {DAY_NAMES[state.settings.protectedDay]} is yours.
        </p>
        <div className="stat-row">
          <div className="stat">
            <span className="k">Body</span>
            <span className="v">
              <i className={body.state} />
              {body.label}
            </span>
            <span className="d">{body.detail}</span>
          </div>
          <div className="stat">
            <span className="k">Money</span>
            <span className="v">
              <i className={m.coveredBy ? "ok" : "warn"} />
              {m.coveredBy ? `Covered by ${m.coveredBy}` : `${money(m.short)} short`}
            </span>
            <span className="d">{m.coveredBy ? `${money(m.past)} past essentials` : `${money(m.total)} of ${money(m.essentials)}`}</span>
          </div>
        </div>
      </header>
      <div className="rv" style={rv()}>
        <Week3D days={days} selectedDay={SCENARIO.today} onOfferTap={(id) => setScreen("offer", id)} height={240} />
        <div className="legend3d" style={{ marginTop: 8 }}>
          <span>
            <i className="shift" />
            Pandora
          </span>
          <span>
            <i className="mcd" />
            McDonald's
          </span>
          <span>
            <i className="uni" />
            Uni
          </span>
          <span>
            <i className="personal" />
            Plans
          </span>
          <span>
            <i className="offer" />
            Offer
          </span>
          <span>
            <i className="rest" />
            Rest
          </span>
        </div>
      </div>
      {pending.map((o) => {
        const emp = EMPLOYERS[o.employer];
        return (
          <button key={o.id} className={`card ask rv${o.status === "deferred" ? " deferred" : ""}`} style={rv()} onClick={() => setScreen("offer", o.id)}>
            <div className="ask-from">
              <span className={`avatar ${o.employer}`} aria-hidden="true">
                {emp.manager.initial}
              </span>
              <div className="who">
                <b>
                  {o.from} · {emp.name}
                </b>
                <span className="when">
                  {o.sentAt}
                  {o.status === "deferred" ? ` · reminder ${o.reminderAt}` : ""}
                </span>
              </div>
            </div>
            <p>“{o.note}”</p>
            <span className="go">Think it through →</span>
          </button>
        );
      })}
      {decided.length > 0 && (
        <div className="card flat replied rv" style={rv()}>
          <div className="k">Replied</div>
          {decided.map((o) => (
            <div key={o.id}>
              <span>
                {o.from} · {o.day} {range12(o.start, o.end)}
              </span>
              <span className={`status-pill ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
            </div>
          ))}
        </div>
      )}
      <div className="agenda rv" style={rv()} aria-label="This week">
        {days.map((d) => (
          <div key={d.day} className={`row${d.today ? " today" : ""}${d.rest && d.items.every((i) => i.kind === "rest") ? " rest" : ""}`}>
            <div className="dn">
              <b>{d.day}</b>
              <span>{d.date}</span>
            </div>
            <div className="items">
              {d.items.length === 0 && (
                <div className="it">
                  <i style={{ background: "var(--line)" }} />
                  <span className="n">Free</span>
                </div>
              )}
              {d.items.map((it) =>
                it.kind === "offer" ? (
                  <button key={it.id} className="it offer" onClick={() => setScreen("offer", it.offerId)}>
                    <i />
                    <span className="t">
                      {it.start}–{it.end}
                    </span>
                    <span className="n">{it.label}</span>
                  </button>
                ) : it.kind === "rest" ? (
                  <div key={it.id} className="it rest">
                    <i />
                    <span className="n">
                      <b>Rest.</b> Booked like a shift.
                    </span>
                  </div>
                ) : it.kind === "due" ? (
                  <div key={it.id} className="it due">
                    <i />
                    <span className="t">{clock12(it.start)}</span>
                    <span className="n">{it.label}</span>
                  </div>
                ) : (
                  <div key={it.id} className={`it ${it.kind} ${it.employer || ""}`}>
                    <i />
                    <span className="t">
                      {it.start}–{it.end}
                    </span>
                    <span className="n">{it.label}</span>
                    {it.warn && <span className="n warn">{it.warn}</span>}
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <button className="btn ghost rv" style={rv()} onClick={() => openSheet({ kind: "plan" })}>
        + Add a plan
      </button>
    </div>
  );
}

/* ---------- OFFER ---------- */

function OfferScreen() {
  const state = useStore();
  const setScreen = useStore((s) => s.setOffshiftScreen);
  const chooseDecision = useStore((s) => s.chooseDecision);
  const respond = useStore((s) => s.respondToOffer);
  const [laterOpen, setLaterOpen] = useState(false);
  const offer = state.offers.find((o) => o.id === state.offerId) || state.offers.find((o) => o.status === "pending" || o.status === "deferred");
  const rv = useRv();
  if (!offer) {
    return (
      <div className="screen">
        <button className="back" onClick={() => setScreen("week")}>
          ← Week
        </button>
        <div className="s-head">
          <div className="s-title">Nothing waiting on you.</div>
        </div>
      </div>
    );
  }
  const emp = EMPLOYERS[offer.employer];
  const checks = offerChecks(offer, state);
  const tiles = impactTiles(offer, state);
  const when = offerWhen(offer);
  const open = offer.status === "pending" || offer.status === "deferred";
  const alts = altSlots(offer, state);
  return (
    <div className="screen">
      <button className="back" onClick={() => setScreen("week")}>
        ← Week
      </button>
      <div className="s-head rv" style={rv()}>
        <div className="s-title">
          Cover {when}, {range12(offer.start, offer.end)}?
        </div>
        <div className="s-sub">
          {offer.from} · {emp.name} · {offer.sentAt}
        </div>
      </div>
      <div className="card flat rv" style={rv()}>
        <div className="ask-from">
          <span className={`avatar ${offer.employer}`} aria-hidden="true">
            {emp.manager.initial}
          </span>
          <p style={{ fontSize: 14 }}>“{offer.note}”</p>
        </div>
      </div>
      {checks.map((c) => (
        <div key={c.key} className={`check ${c.state} rv`} style={rv()}>
          <div className="ck">{c.key}</div>
          <div>{c.text}</div>
        </div>
      ))}
      <div className="impact-panel rv" style={rv()} aria-label="Impact">
        {tiles.map((t) => (
          <div key={t.key} className="impact-tile" data-state={t.state}>
            <b>{t.title}</b>
            <strong>{t.value}</strong>
            <small>{t.detail}</small>
          </div>
        ))}
      </div>
      {open ? (
        <div className="decisions rv" style={rv()}>
          <button className="btn take" onClick={() => chooseDecision("accept")}>
            Take it<small>about {money(shiftIncome(offer))}</small>
          </button>
          <button className="btn alt" onClick={() => chooseDecision("negotiate")}>
            Another time<small>{alts[0]?.label}</small>
          </button>
          <button className="btn swap" onClick={() => chooseDecision("swap")}>
            Ask for a swap<small>{emp.colleagues[1]} could take it</small>
          </button>
          <button className="btn no" onClick={() => chooseDecision("decline")}>
            Not {when}
            <small>honest, no excuse</small>
          </button>
          {!laterOpen ? (
            <button className="btn later wide" onClick={() => setLaterOpen(true)}>
              Decide later
            </button>
          ) : (
            <div className="chips" style={{ gridColumn: "1/-1", justifyContent: "center" }}>
              {[30, 60, 120].map((mins) => (
                <button key={mins} className="chip" onClick={() => respond(offer.id, "later", "", { reminderMinutes: mins })}>
                  {mins === 120 ? "2 hours" : mins === 60 ? "1 hour" : "30 min"}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card soft rv" style={rv()}>
          <div className="k">{STATUS_LABEL[offer.status]}</div>
          <p>
            Replied {offer.repliedAt}.
            {offer.status === "countered" && offer.alt ? ` Offered ${offer.alt.label}.` : ""}
            {offer.status === "swap-requested" ? ` ${offer.colleague} could take it.` : ""}
            {offer.status === "alt-confirmed" && offer.alt ? ` ${offer.alt.label} is in your week.` : ""}
            {offer.status === "swapped" ? ` ${offer.colleague} has it.` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- REPLY ---------- */

function ReplyScreen() {
  const state = useStore();
  const setScreen = useStore((s) => s.setOffshiftScreen);
  const chooseDecision = useStore((s) => s.chooseDecision);
  const respond = useStore((s) => s.respondToOffer);
  const updateSettings = useStore((s) => s.updateSettings);
  const showToast = useStore((s) => s.showToast);
  const offer = state.offers.find((o) => o.id === state.offerId);
  const decision = state.decision;
  const draft = offer && decision && decision !== "later" ? replyDraft(offer, decision, state, { alt: state.alt || undefined, colleague: state.colleague || undefined }) : null;
  const draftText = draft ? draftFor(draft, state.settings.tone) : "";
  const [text, setText] = useState(draftText);
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    setText(draftText);
    setTyped(0);
    if (!draftText) return;
    let i = 0;
    const t = setInterval(() => {
      i += 3;
      setTyped(i);
      if (i >= draftText.length) clearInterval(t);
    }, 12);
    return () => clearInterval(t);
  }, [draftText]);
  const rv = useRv();
  if (!offer || !decision || !draft) {
    return (
      <div className="screen">
        <button className="back" onClick={() => setScreen("week")}>
          ← Week
        </button>
      </div>
    );
  }
  const emp = EMPLOYERS[offer.employer];
  const typing = typed < draftText.length && text === draftText;
  const shownText = typing ? draftText.slice(0, typed) : text;
  return (
    <div className="screen">
      <button className="back" onClick={() => setScreen("offer", offer.id)}>
        ← Offer
      </button>
      <div className="s-head rv" style={rv()}>
        <div className="s-title">{draft.title}</div>
        <div className="s-sub">To {offer.from}, via {emp.workerApp}</div>
      </div>
      <div className="seg rv" style={rv()} role="group" aria-label="Tone">
        {(["warm", "plain"] as const).map((t) => (
          <button key={t} aria-pressed={state.settings.tone === t} onClick={() => updateSettings({ tone: t })}>
            {t === "warm" ? "Warm" : "Plain"}
          </button>
        ))}
      </div>
      {decision === "negotiate" && (
        <div className="chips rv" style={rv()} role="group" aria-label="Alternative time">
          {altSlots(offer, state).map((a) => (
            <button key={a.label} className="chip" aria-pressed={state.alt?.label === a.label} onClick={() => chooseDecision("negotiate", { alt: a })}>
              {a.label}
            </button>
          ))}
        </div>
      )}
      {decision === "swap" && (
        <div className="chips rv" style={rv()} role="group" aria-label="Who could take it">
          {emp.colleagues
            .filter((c) => !new RegExp(`${c}'s (sick|unwell)`, "i").test(offer.note))
            .map((c) => (
              <button key={c} className="chip" aria-pressed={state.colleague === c} onClick={() => chooseDecision("swap", { colleague: c })}>
                {c}
              </button>
            ))}
        </div>
      )}
      <div className="card msg rv" style={rv()}>
        <textarea value={shownText} onChange={(e) => setText(e.target.value)} readOnly={typing} aria-label="Reply" spellCheck={false} />
      </div>
      <p className="quiet rv" style={rv()}>
        {draft.note}
      </p>
      <div className="btn-row rv" style={rv()}>
        <button className="btn send-btn" onClick={() => respond(offer.id, decision, text, { alt: state.alt || undefined, colleague: state.colleague || undefined })}>
          <SendIcon /> Send
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => showToast("Copied."), () => showToast("Select the text to copy it."));
            else showToast("Select the text to copy it.");
          }}
        >
          Copy
        </button>
      </div>
      <div className="card soft rv" style={rv()}>
        <div className="k">Then</div>
        <p>{draft.after}</p>
      </div>
    </div>
  );
}

/* ---------- CHECK-IN ---------- */

function CheckinScreen() {
  const state = useStore();
  const rateShift = useStore((s) => s.rateShift);
  const now = absMinutes(SCENARIO.today, state.clock);
  const finished = state.shifts.filter((s) => absMinutes(s.day, s.end) <= now).sort((a, b) => absMinutes(b.day, b.end) - absMinutes(a.day, a.end));
  const defaultShift = finished.find((s) => !s.rated) || finished[0];
  const [shiftId, setShiftId] = useState(defaultShift?.id || "");
  const shift = state.shifts.find((s) => s.id === shiftId) || defaultShift;
  const [body, setBody] = useState<BodyRating | null>(shift?.rated || null);
  const [kit, setKit] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const rv = useRv();
  if (!shift) {
    return (
      <div className="screen">
        <div className="s-head">
          <div className="s-title">No shift to check in on yet.</div>
        </div>
      </div>
    );
  }
  const emp = EMPLOYERS[shift.employer];
  function finish() {
    if (!shift || !body) return;
    rateShift(shift.id, body, kit);
    const nd = nextDay(shift.day);
    const first = [...state.uni.filter((u) => u.type !== "due"), ...state.shifts].filter((e) => e.day === nd).sort((a, b) => minutes(a.start) - minutes(b.start))[0];
    const hasShift = state.shifts.some((s) => s.day === nd);
    let msg = first
      ? `${DAY_NAMES[nd]} starts with ${"title" in first ? first.title.toLowerCase() : `a ${EMPLOYERS[first.employer].name} shift`} at ${clock12(first.start)}${hasShift ? "." : ", and no shift. You're off."}`
      : `Nothing on ${DAY_NAMES[nd]}. You're off.`;
    const wipedCount = state.shifts.filter((s) => s.rated === "wiped" && s.id !== shift.id).length + (body === "wiped" ? 1 : 0);
    if (body === "wiped" && wipedCount >= 2) msg = `That's ${wipedCount} Wiped shifts this fortnight. Worth remembering when ${emp.manager.name} next asks. ` + msg;
    if (body === "fine") msg = `Good ${isClose(shift) ? "close" : "shift"}. ` + msg;
    const chosen = kit.filter((k) => k !== "Nothing, I'm good");
    if (chosen.length) msg += ` Tonight: ${chosen.map((k) => k.charAt(0).toLowerCase() + k.slice(1)).join(", ")}.`;
    setResult(msg.trim());
  }
  return (
    <div className="screen">
      <div className="s-head rv" style={rv()}>
        <div className="eyebrow">
          {shift.day} {SCENARIO.dates[shift.day]} {SCENARIO.monthShort} · {shift.start}–{shift.end} · {emp.name}
          {isClose(shift) ? " · close" : ""}
        </div>
        <div className="s-title">Clocked off. How's the body?</div>
      </div>
      {finished.length > 1 && (
        <div className="chips rv" style={rv()} role="group" aria-label="Which shift">
          {finished.map((s) => (
            <button
              key={s.id}
              className="chip"
              aria-pressed={s.id === shift.id}
              onClick={() => {
                setShiftId(s.id);
                setBody(s.rated || null);
                setResult(null);
              }}
            >
              {s.day} {EMPLOYERS[s.employer].name}
            </button>
          ))}
        </div>
      )}
      <div className="opts rv" style={rv()} role="group" aria-label="How's the body">
        <button className="opt" aria-pressed={body === "fine"} onClick={() => setBody("fine")}>
          Fine<small>could do it again</small>
        </button>
        <button className="opt" aria-pressed={body === "tired"} onClick={() => setBody("tired")}>
          Tired<small>legs and feet</small>
        </button>
        <button className="opt" aria-pressed={body === "wiped"} onClick={() => setBody("wiped")}>
          Wiped<small>blanked out a bit</small>
        </button>
      </div>
      <div className="s-sub rv" style={rv()}>
        One thing for tonight?
      </div>
      <div className="chips rv" style={rv()} role="group" aria-label="Recovery kit">
        {RECOVERY_KIT.map((k) => (
          <button key={k} className="chip" aria-pressed={kit.includes(k)} onClick={() => setKit((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))}>
            {k}
          </button>
        ))}
      </div>
      <button className="btn rv" style={rv()} onClick={finish} disabled={!body}>
        Done
      </button>
      {result && (
        <div className="card soft unfold">
          <div className="k">Noted</div>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

/* ---------- MONEY ---------- */

function MoneyScreen() {
  const state = useStore();
  const updateSettings = useStore((s) => s.updateSettings);
  const m = moneySummary(state);
  const rv = useRv();
  const perEmployer = EMPLOYER_IDS.map((id) => ({ id, total: state.shifts.filter((s) => s.employer === id).reduce((sum, s) => sum + shiftIncome(s), 0) }));
  const lastShift = [...state.shifts].sort((a, b) => dayIndex(b.day) - dayIndex(a.day))[0];
  const r = 54;
  const C = 2 * Math.PI * r;
  const earnedFrac = Math.min(1, m.earned / m.essentials);
  const bookedFrac = Math.min(1, (m.earned + m.booked) / m.essentials);
  return (
    <div className="screen">
      <div className="s-head rv" style={rv()}>
        <div className="eyebrow">{SCENARIO.fortnightLabel}</div>
        <div className="s-title">{m.coveredBy ? `Covered by ${DAY_NAMES[m.coveredBy]}.` : `${money(m.short)} short.`}</div>
        <div className="s-sub">{m.coveredBy ? "Anything past that is a choice, not a debt." : "Booked shifts don't reach essentials yet."}</div>
      </div>
      <div className="card rv" style={rv()}>
        <div className="ring-wrap">
          <div className="ring" role="img" aria-label={`Earned ${money(m.earned)}, booked ${money(m.booked)}, essentials ${money(m.essentials)}`}>
            <svg viewBox="0 0 132 132">
              <circle className="track" cx="66" cy="66" r={r} />
              <circle className="booked" cx="66" cy="66" r={r} strokeDasharray={C} strokeDashoffset={C * (1 - bookedFrac)} />
              <circle className="earned" cx="66" cy="66" r={r} strokeDasharray={C} strokeDashoffset={C * (1 - earnedFrac)} />
            </svg>
            <div className="mid">
              <b>{Math.round(((m.earned + m.booked) / m.essentials) * 100)}%</b>
              <span>of {money(m.essentials)}</span>
            </div>
          </div>
          <div className="ring-legend">
            <div>
              <span>Earned</span>
              <b>{money(m.earned)}</b>
            </div>
            <div>
              <span>Booked</span>
              <b>{money(m.booked)}</b>
            </div>
            <div>
              <span>Rent</span>
              <b>{money(state.settings.rent)}</b>
            </div>
            <div>
              <span>Groceries, bus</span>
              <b>{money(state.settings.other)}</b>
            </div>
          </div>
        </div>
        {m.past >= 0 && lastShift && (
          <p className="quiet">
            {DAY_NAMES[lastShift.day]}'s shift takes you about {money(m.past)} past essentials.
          </p>
        )}
      </div>
      <div className="card rv" style={rv()}>
        <div className="k">This week</div>
        {perEmployer.map((p) => (
          <div key={p.id} className="bar-k">
            <span>
              {EMPLOYERS[p.id].name} · {state.shifts.filter((s) => s.employer === p.id).length} shifts
            </span>
            <span className="mono">{money(p.total)}</span>
          </div>
        ))}
      </div>
      <div className="card rv" style={rv()}>
        <div className="bar-k" style={{ alignItems: "center" }}>
          <div>
            <div className="k">Quiet weeks ahead</div>
            <p style={{ fontSize: 13.5 }}>Heads-up in early December before hours drop.</p>
          </div>
          <button className="switch" role="switch" aria-checked={state.settings.quietWeeksReminder} aria-label="Quiet weeks reminder" onClick={() => updateSettings({ quietWeeksReminder: !state.settings.quietWeeksReminder })} />
        </div>
      </div>
      <div className="card rv" style={rv()}>
        <div className="k">Protected</div>
        <p>
          <b>{DAY_NAMES[state.settings.protectedDay]}.</b> Rest, booked like a shift.
        </p>
        <p>
          <b>Exam block, 2–13 Nov.</b> Two shifts a week. Availability closes 26 Oct.
        </p>
      </div>
    </div>
  );
}

/* ---------- ME ---------- */

function MeScreen() {
  const state = useStore();
  const updateSettings = useStore((s) => s.updateSettings);
  const showToast = useStore((s) => s.showToast);
  const s = state.settings;
  const rv = useRv();
  return (
    <div className="screen">
      <div className="s-head rv" style={rv()}>
        <div className="s-title">This month</div>
      </div>
      <div className="seg rv" style={rv()} role="group" aria-label="Priority">
        {(["health", "uni", "money"] as const).map((p) => (
          <button key={p} aria-pressed={s.priority === p} onClick={() => updateSettings({ priority: p })}>
            {p === "health" ? "Health" : p === "uni" ? "Uni" : "Money"}
          </button>
        ))}
      </div>
      <div className="card list rv" style={rv()}>
        <div className="lr">
          <span>Protected day</span>
          <select value={s.protectedDay} onChange={(e) => updateSettings({ protectedDay: e.target.value as Day })} aria-label="Protected day">
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {DAY_NAMES[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="lr">
          <span>Essentials a fortnight</span>
          <input type="number" min={0} step={10} value={s.essentials} aria-label="Essentials" onChange={(e) => updateSettings({ essentials: Math.max(0, Number(e.target.value) || 0) })} />
        </div>
        <div className="lr">
          <span>Rent</span>
          <input type="number" min={0} step={10} value={s.rent} aria-label="Rent" onChange={(e) => updateSettings({ rent: Math.max(0, Number(e.target.value) || 0), essentials: Math.max(0, Number(e.target.value) || 0) + s.other })} />
        </div>
        <div className="lr">
          <span>Travel from uni</span>
          <span className="stepper">
            <button onClick={() => updateSettings({ travelFromUniMin: Math.max(5, s.travelFromUniMin - 5) })} aria-label="Less travel">
              −
            </button>
            <b>{s.travelFromUniMin} min</b>
            <button onClick={() => updateSettings({ travelFromUniMin: Math.min(120, s.travelFromUniMin + 5) })} aria-label="More travel">
              +
            </button>
          </span>
        </div>
        <div className="lr">
          <span>Closes in a row before a flag</span>
          <span className="stepper">
            <button onClick={() => updateSettings({ closesBeforeFlag: Math.max(1, s.closesBeforeFlag - 1) })} aria-label="Fewer closes">
              −
            </button>
            <b>{s.closesBeforeFlag}</b>
            <button onClick={() => updateSettings({ closesBeforeFlag: Math.min(5, s.closesBeforeFlag + 1) })} aria-label="More closes">
              +
            </button>
          </span>
        </div>
      </div>
      <div className="card rv" style={rv()}>
        <div className="k">Connected</div>
        <div className="conn">
          {(
            [
              ["pandora", "Pandora Team", "Roster, asks, chat", "in · replies out"],
              ["mcd", "McDonald's Crew", "Roster, asks, chat", "in · replies out"],
              ["myuq", "myUQ", "Timetable, due dates", "in"],
              ["calendar", "Calendar", "Plans in, shifts out", "both"],
              ["translink", "Translink", "Travel time", "in"],
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
      <div className="card rv" style={rv()}>
        <div className="k">Recovery kit</div>
        <div className="chips">
          <span className="chip static">Favourite meal</span>
          <span className="chip static">Early night</span>
          <span className="chip static">Call home</span>
          <button className="chip" onClick={() => showToast("Only you see this.")}>
            + Add
          </button>
        </div>
      </div>
      <div className="card privacy rv" style={rv()}>
        <div className="k">Who sees this</div>
        <p>
          <b>Only you.</b> Body, mood and money never leave this phone.
        </p>
      </div>
    </div>
  );
}

/* ---------- APP ---------- */

const PARENT: Partial<Record<OffshiftScreen, OffshiftScreen>> = { offer: "week", reply: "week" };

export default function OffshiftApp() {
  const screen = useStore((s) => s.offshiftScreen);
  const setScreen = useStore((s) => s.setOffshiftScreen);
  const pending = useStore((s) => s.offers.filter((o) => o.status === "pending" || o.status === "deferred").length);
  const current = PARENT[screen] || screen;
  return (
    <div className="app">
      <div className="app-body" key={screen}>
        {screen === "week" && <WeekScreen />}
        {screen === "offer" && <OfferScreen />}
        {screen === "reply" && <ReplyScreen />}
        {screen === "checkin" && <CheckinScreen />}
        {screen === "money" && <MoneyScreen />}
        {screen === "me" && <MeScreen />}
      </div>
      <nav className="osnav" aria-label="Offshift">
        {(["week", "money", "checkin", "me"] as const).map((s) => (
          <button key={s} aria-current={current === s} onClick={() => setScreen(s)}>
            <NavIcon name={s} />
            {s === "week" ? "Week" : s === "money" ? "Money" : s === "checkin" ? "Check-in" : "Me"}
            {s === "week" && pending ? <span className="cnt">{pending}</span> : null}
          </button>
        ))}
      </nav>
    </div>
  );
}
