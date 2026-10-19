"use client";

import { useEffect, useMemo, useState } from "react";
import { altSlots, draftFor, offerChecks, offerWhen, replyDraft } from "@/lib/checks";
import { clock12, range12 } from "@/lib/logic";
import { useStore } from "@/lib/store";
import { syncOnline } from "@/lib/sync";
import { nowIn, shortDate, type Now } from "@/lib/time";
import { STATUS } from "@/lib/status";
import type { AltSlot, Decision } from "@/lib/types";


/** One ask: the facts Offshift can see, the five answers, and a drafted reply the worker owns. */
export default function AskPanel({ offerId, now, initialChoice = null, onClose }: { offerId: string; now: Pick<Now, "date" | "time">; initialChoice?: Exclude<Decision, "later"> | null; onClose: () => void }) {
  const state = useStore();
  const respond = useStore((s) => s.respondToOffer);
  const showToast = useStore((s) => s.showToast);
  const offer = state.offers.find((o) => o.id === offerId);
  const [choice, setChoice] = useState<Exclude<Decision, "later"> | null>(initialChoice);
  const [alt, setAlt] = useState<AltSlot | undefined>(undefined);
  const [colleague, setColleague] = useState("");
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);

  const alts = useMemo(() => (offer ? altSlots(offer, state, now) : []), [offer, state, now]);
  const draft = offer && choice ? replyDraft(offer, choice, state, now, { alt: alt ?? alts[0], colleague }) : null;
  const draftText = draft ? draftFor(draft, state.settings.tone) : "";

  useEffect(() => {
    if (!edited) setText(draftText);
  }, [draftText, edited]);

  if (!offer) return null;
  const when = offerWhen(offer, now);
  const open = offer.status === "pending" || offer.status === "deferred";
  const checks = offerChecks(offer, state, now);
  const thread = state.messages.filter((m) => m.offerId === offer.id);
  const sentAt = clock12(nowIn(state.settings.timeZone, new Date(offer.sentAt)).time);

  function pick(d: Exclude<Decision, "later">) {
    setChoice(d);
    setEdited(false);
  }

  function send() {
    if (!offer || !choice || !text.trim()) return;
    respond(offer.id, choice, text.trim(), { alt: alt ?? alts[0], colleague: colleague.trim() || undefined });
    if (!syncOnline()) showToast(`Saved. It goes to ${offer.from} once you're back online.`);
    setChoice(null);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied. Paste it into your chat with ${offer!.from}.`);
    } catch {
      showToast("Couldn't copy here. Select the text and copy it instead.");
    }
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
          <div className="ck">{c.key}</div>
          <div>{c.text}</div>
        </div>
      ))}

      {open && !choice && (
        <div className="decisions" role="group" aria-label="Your answer">
          <button className="btn take" onClick={() => pick("accept")}>
            <b>Take it</b>
            <small>Adds it to your week</small>
          </button>
          <button className="btn negotiate" onClick={() => pick("negotiate")} disabled={!alts.length}>
            <b>Another time</b>
            <small>{alts[0]?.label ?? "No free time nearby"}</small>
          </button>
          <button className="btn swap" onClick={() => pick("swap")}>
            <b>Ask for a swap</b>
            <small>Someone else could take it</small>
          </button>
          <button className="btn decline" onClick={() => pick("decline")}>
            <b>Not {when}</b>
            <small>Honest, no excuse</small>
          </button>
          <button className="btn later" onClick={() => respond(offer.id, "later", "")}>
            <b>Decide later</b>
            <small>Reminder in 30 min, nothing sent</small>
          </button>
        </div>
      )}

      {open && choice && draft && (
        <div className="draft-box">
          <div className="eyebrow">{draft.title}</div>
          {choice === "negotiate" && alts.length > 0 && (
            <div className="field">
              <label htmlFor="alt-pick">Offer instead</label>
              <select
                id="alt-pick"
                value={(alt ?? alts[0]).label}
                onChange={(e) => setAlt(alts.find((a) => a.label === e.target.value))}
              >
                {alts.map((a) => (
                  <option key={a.label} value={a.label}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {choice === "swap" && (
            <div className="field">
              <label htmlFor="swap-who">Who could take it? (optional)</label>
              <input
                id="swap-who"
                value={colleague}
                maxLength={40}
                onChange={(e) => setColleague(e.target.value)}
                placeholder="A colleague's name"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="reply-text">Your reply to {offer.from}</label>
            <textarea
              id="reply-text"
              rows={5}
              maxLength={1500}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setEdited(true);
              }}
            />
          </div>
          <p className="quiet">{draft.note}</p>
          {edited && text.trim() !== draftText.trim() && (
            <button className="btn ghost small redo" onClick={() => setEdited(false)}>
              Use Offshift&apos;s draft again
            </button>
          )}
          <div className="row-actions">
            <button className="btn ghost" onClick={() => setChoice(null)}>
              Back
            </button>
            <button className="btn ghost" onClick={copy}>
              Copy
            </button>
            <button className="btn" onClick={send} disabled={!text.trim()}>
              Send reply
            </button>
          </div>
        </div>
      )}

      {!open && choice && <p className="form-note">This was answered on another device before your reply went, so your reply wasn&apos;t sent.</p>}
      {!open && <div className={`status-pill big ${offer.status === "declined" ? "" : "ok"}`}>{STATUS[offer.status]}</div>}
      {thread.length > 1 && (
        <ol className="thread" aria-label="Conversation">
          {thread.slice(1).map((m) => (
            <li key={m.id} className={`by-${m.from}`}>
              <b>{m.from === "worker" ? "You" : offer.from}</b>
              <span>{m.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
