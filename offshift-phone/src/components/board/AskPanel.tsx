"use client";

import { BodyStrip } from "./BodyStrip";
import { offerChecks, offerWhen } from "@/lib/checks";
import { EFFORT_COLOUR, EFFORT_WORD } from "@/lib/effort";
import { clock12, range12 } from "@/lib/logic";
import { pastShifts } from "@/lib/past-shifts";
import { useStore } from "@/lib/store";
import { nowIn, shortDate, weekdayName, type Now } from "@/lib/time";
import { STATUS } from "@/lib/status";
import type { Check, Decision, Shift } from "@/lib/types";

const CHECK_LABEL: Record<Check["key"], string> = { body: "Body", week: "Week", past: "Past shifts" };

/**
 * One ask: the facts Offshift can see, how the last shifts at that workplace went, and three answers. Accept puts the shift on the week, Decline takes the ask off it,
 * and Later leaves it on the week, see-through, to press again. Nothing is sent to the manager.
 */
export default function AskPanel({
  offerId,
  now,
  suggested = null,
  onClose,
  onAnswered,
}: {
  offerId: string;
  now: Pick<Now, "date" | "time">;
  /** The answer the worker already said, by voice or by flicking the ask away. It is only pointed out: they still press it. */
  suggested?: Exclude<Decision, "later"> | null;
  onClose: () => void;
  /** After Accept or Decline, with the line the Undo bar shows. */
  onAnswered: (offerId: string, text: string) => void;
}) {
  const state = useStore();
  const respond = useStore((s) => s.respondToOffer);
  const offer = state.offers.find((o) => o.id === offerId);
  if (!offer) return null;
  const when = offerWhen(offer, now);
  const open = offer.status === "pending" || offer.status === "deferred";
  const checks = offerChecks(offer, state, now);
  const past = pastShifts(offer, state, now);
  const sentAt = clock12(nowIn(state.settings.timeZone, new Date(offer.sentAt)).time);

  function answer(d: Decision) {
    if (!offer) return;
    respond(offer.id, d);
    if (d === "later") return onClose();
    onAnswered(offer.id, d === "accept" ? `Added ${offer.workplace} ${weekdayName(offer.date)} to your week` : `Declined ${offer.from}'s ask for ${weekdayName(offer.date)}`);
  }

  return (
    <div className="offer-panel">
      <div className="side-head">
        <div>
          <div className="eyebrow">
            {offer.from} · {offer.workplace} · asked {sentAt}
          </div>
          <h2>
            Cover {when}, {range12(offer.start, offer.end)}?
          </h2>
          {when !== shortDate(offer.date) && <p className="when-date">{shortDate(offer.date)}</p>}
        </div>
        <button className="x" onClick={onClose} aria-label="Close the ask">
          ×
        </button>
      </div>
      <div className="card flat ask-note">
        <p>“{offer.note}”</p>
      </div>
      {checks.map((c) => (
        <div key={c.key} className={`check ${c.state}`}>
          <div className="ck">{CHECK_LABEL[c.key]}</div>
          <div>
            {c.text}
            {c.key === "past" && <PastRows shifts={past} />}
          </div>
        </div>
      ))}

      {open && (
        <>
          {suggested && <p className="form-note">You said {suggested === "accept" ? "accept" : "decline"}. Press it below to make it so.</p>}
          {offer.status === "deferred" && <p className="form-note">You kept this for later.</p>}
          <div className="decisions" role="group" aria-label="Your answer">
            <button className={`btn take${suggested === "accept" ? " suggested" : ""}`} onClick={() => answer("accept")}>
              <b>Accept</b>
            </button>
            <button className={`btn decline${suggested === "decline" ? " suggested" : ""}`} onClick={() => answer("decline")}>
              <b>Decline</b>
            </button>
            {offer.status === "pending" && (
              <button className="btn later" onClick={() => answer("later")}>
                <b>Decide later</b>
              </button>
            )}
          </div>
          <p className="quiet">Nothing is sent to {offer.from}.</p>
        </>
      )}

      {!open && <div className={`status-pill big ${offer.status === "declined" ? "" : "ok"}`}>{STATUS[offer.status]}</div>}
    </div>
  );
}

/** Small multiples of the last shifts at this workplace: when, the worker's word, and the watch's two strips. */
function PastRows({ shifts }: { shifts: Shift[] }) {
  if (!shifts.length) return null;
  return (
    <ul className="past-rows">
      {shifts.map((s) => (
        <li key={s.id}>
          <span className="past-when">
            {shortDate(s.date)} · {range12(s.start, s.end)}
          </span>
          <span className="past-rating">
            {s.effort ? (
              <>
                <i className="swatch" style={{ background: EFFORT_COLOUR[s.effort] }} aria-hidden="true" />
                {EFFORT_WORD[s.effort]}
              </>
            ) : (
              "Not rated"
            )}
          </span>
          {s.body ? (
            <span className="past-body">
              <BodyStrip levels={s.body.stress} signal="stress" shift={s} label />
              <BodyStrip levels={s.body.heart} signal="heart" shift={s} label />
            </span>
          ) : (
            <span className="past-body quiet">No watch reading</span>
          )}
        </li>
      ))}
    </ul>
  );
}
