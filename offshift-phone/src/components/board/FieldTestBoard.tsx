"use client";

import { useMemo, useState } from "react";
import { ListRow } from "./ListRow";
import { WatchFace } from "./WatchFace";
import Week3D from "./Week3D";
import { buildWeek } from "@/lib/checks";
import { EFFORTS, EFFORT_COLOUR, EFFORT_WORD } from "@/lib/effort";
import { FIELD_TEST_WEEK, fieldTestData, fieldTestMoments } from "@/lib/field-test";
import { DAY_NAMES, clock12, dayIndex, range12 } from "@/lib/logic";
import { LOAD_COLOUR, LOAD_WORDS, SHIFT_SIGNALS, SIGNAL_MEANING, SIGNAL_NAME } from "@/lib/shift-body";
import { addDays, longDate, nowIn, weekDates, weekLabel, weekdayName } from "@/lib/time";
import type { DateKey, ShiftSignal } from "@/lib/types";

/** After the week ended, so every shift, rating and answer is in the past. */
const AFTER = { date: "2026-10-26", time: "09:00" };
const STATUS: Record<string, string> = { declined: "He declined", accepted: "He accepted", deferred: "He kept it for later", pending: "Waiting" };

/** The field-test week, read only: the 3D week with his ratings and readings, and what his watch showed. */
export default function FieldTestBoard() {
  const data = useMemo(fieldTestData, []);
  const moments = useMemo(fieldTestMoments, []);
  const dates = useMemo(() => weekDates(FIELD_TEST_WEEK), []);
  const week = useMemo(() => buildWeek(data, FIELD_TEST_WEEK, AFTER), [data]);
  const [selected, setSelected] = useState<DateKey>(FIELD_TEST_WEEK);
  const [signal, setSignal] = useState<ShiftSignal>("stress");
  const view = week.find((d) => d.date === selected) ?? week[0];
  const items = view.items.filter((it) => it.kind !== "rest");
  const asks = data.offers.filter((o) => o.date === selected);
  const tz = data.settings.timeZone;

  return (
    <div className="board field-board">
      <header className="board-head">
        <div className="board-title">
          <div className="eyebrow">Field test F1 · {weekLabel(FIELD_TEST_WEEK)} 2026</div>
          <h1>His week, on his wrist</h1>
        </div>
        <p className="field-intro">
          One fast-food worker used Offshift for a week: three Burger bar shifts, classes on Tuesday and Thursday, and a coding demo on Friday. Tap a day to see it.
        </p>
        <a className="btn ghost small" href="/calendar">
          Your week
        </a>
      </header>

      <div className="board-main">
        <div className="stage-wrap-3d">
          <Week3D
            className="big"
            height="100%"
            detail
            days={week}
            selectedDay={view.day}
            onDayTap={(d) => setSelected(dates[dayIndex(d)])}
            onOfferTap={() => {}}
            bodySignal={signal}
            hint="drag to turn the week · tap a day"
          />
          <div className="stage-legends">
            <div className="effort-legend band-legend" role="group" aria-label="His watch during each shift">
              <span>Down each shift: his watch</span>
              {SHIFT_SIGNALS.map((sig) => (
                <button key={sig} type="button" aria-pressed={signal === sig} className={signal === sig ? "on" : ""} onClick={() => setSignal(sig)}>
                  {SIGNAL_NAME[sig]}
                </button>
              ))}
              <span className="band-scale" title={`Darker means ${SIGNAL_MEANING[signal]}`}>
                {LOAD_COLOUR.map((c, i) => (
                  <i key={c} className="swatch" style={{ background: c }} aria-hidden="true" title={LOAD_WORDS[signal][i]} />
                ))}
                {LOAD_WORDS[signal][0].toLowerCase()} to {LOAD_WORDS[signal][3].toLowerCase()}
              </span>
              <span>
                <i className="swatch hatch" aria-hidden="true" />
                no reading
              </span>
            </div>
            <div className="effort-legend" aria-label="How the work was, lightest to hardest">
              <span>How the work was</span>
              {EFFORTS.map((e) => (
                <span key={e}>
                  <i className="swatch" style={{ background: EFFORT_COLOUR[e] }} aria-hidden="true" />
                  {EFFORT_WORD[e]}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="board-side" aria-label="Day">
          <div className="side-head">
            <div>
              <div className="eyebrow">Field test · {DAY_NAMES[view.day]}</div>
              <h2>{longDate(view.date)}</h2>
            </div>
            <div className="day-nav">
              <button onClick={() => setSelected(addDays(selected, -1))} disabled={selected === dates[0]} aria-label="Previous day">
                ‹
              </button>
              <button onClick={() => setSelected(addDays(selected, 1))} disabled={selected === dates[6]} aria-label="Next day">
                ›
              </button>
            </div>
          </div>
          <div className="cal-list">
            {items.length === 0 && <p className="quiet">Nothing on.</p>}
            {items.map((it) => (
              <ListRow key={it.id} it={it} signal={signal} />
            ))}
            {asks.map((o) => {
              const sent = nowIn(tz, new Date(o.sentAt));
              const replied = o.repliedAt ? nowIn(tz, new Date(o.repliedAt)) : null;
              return (
                <div key={o.id} className="field-ask">
                  <b>
                    {o.from} asked him to cover {range12(o.start, o.end)}
                  </b>
                  <span>
                    Asked {weekdayName(sent.date)} {clock12(sent.time)}. {STATUS[o.status]}
                    {replied ? ` on ${weekdayName(replied.date)} at ${clock12(replied.time)}` : ""}. Nothing was sent to {o.from}.
                  </span>
                </div>
              );
            })}
          </div>
          <div className="cal-week board-strip" role="tablist" aria-label="Days">
            {week.map((d) => (
              <button key={d.date} role="tab" aria-selected={d.date === selected} onClick={() => setSelected(d.date)}>
                <small>{d.day}</small>
                <b>{d.dayNum}</b>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <section className="field-watch" aria-label="On his watch">
        <div className="eyebrow">On his watch</div>
        <h2>What the watch showed, moment by moment</h2>
        <ol className="field-moments">
          {moments.map((m) => (
            <li key={m.id}>
              <button type="button" className={m.date === selected ? "on" : undefined} onClick={() => setSelected(m.date)} aria-label={`${weekdayName(m.date)} ${clock12(m.time)}: ${m.caption} Show that day.`}>
                <WatchFace screen={m.screen} />
                <span className="field-when">
                  {weekdayName(m.date).slice(0, 3)} {clock12(m.time)}
                </span>
                <span className="field-cap">{m.caption}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="field-note">
          Rebuilt from the field-test notes. His shifts, classes, ratings and answers are as he reported them. The 15-minute readings are a reconstruction of what he described, not the raw watch data. The workplace and the manager&apos;s name are changed. Nothing here is saved or sent anywhere.
        </p>
      </section>
    </div>
  );
}
