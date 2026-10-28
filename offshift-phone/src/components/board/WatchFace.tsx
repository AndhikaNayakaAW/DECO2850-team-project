import { EFFORTS, EFFORT_WORD } from "@/lib/effort";
import type { WatchScreen } from "@/lib/field-test";
import type { Decision, Effort } from "@/lib/types";

const EFFORT_HINT: Record<Effort, string> = { light: "Easy going", steady: "A normal shift", busy: "Fast, lots to do", hard: "Asked a lot of you" };
const ANSWERS: { d: Decision; label: string }[] = [
  { d: "accept", label: "Accept" },
  { d: "decline", label: "Decline" },
  { d: "later", label: "Decide later" },
];

/** A drawing of one Offshift watch screen, with the watch app's layout and colours and the text it showed. */
export function WatchFace({ screen }: { screen: WatchScreen }) {
  if (screen.kind === "check-in" || screen.kind === "answer") {
    const title = screen.kind === "check-in" ? screen.title : `Answer ${screen.to}`;
    const items =
      screen.kind === "check-in"
        ? [...EFFORTS.map((e) => ({ key: e, label: EFFORT_WORD[e], hint: EFFORT_HINT[e], on: e === screen.chosen })), { key: "skip", label: "Skip", hint: "Not this time", on: false }]
        : ANSWERS.map((a) => ({ key: a.d, label: a.label, hint: "", on: a.d === screen.chosen }));
    const at = items.findIndex((i) => i.on);
    const shown = items.slice(Math.max(0, at - 1), Math.max(0, at - 1) + 3);
    return (
      <div className="wf-bezel" role="img" aria-label={`Watch: ${title}. ${items[at].label} chosen.`}>
        <div className="wf-face wf-menu">
          <div className="wf-mt">{title}</div>
          <ul>
            {shown.map((i) => (
              <li key={i.key} className={i.on ? "on" : undefined}>
                {i.label}
                {i.hint && <small>{i.hint}</small>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  const head = screen.kind === "ask" ? "Ask" : screen.kind === "around" ? "Around it" : "Last shift";
  return (
    <div className="wf-bezel" role="img" aria-label={`Watch, ${head}: ${screen.kind === "ask" ? `${screen.from}. ${screen.question} ${screen.time}` : screen.kind === "around" ? screen.lines.join(". ") : `${screen.title}. ${screen.lines.join(" ")}`}`}>
      <div className="wf-face">
        <div className="wf-brand">OFFSHIFT</div>
        <div className="wf-head">{head.toUpperCase()}</div>
        <div className="wf-bar" />
        <div className={`wf-card wf-${screen.kind}`}>
          {screen.kind === "ask" && (
            <>
              <span className="wf-muted">{screen.from}</span>
              <span className="wf-strong">{screen.question}</span>
              <span className="wf-time">{screen.time}</span>
            </>
          )}
          {screen.kind === "around" && screen.lines.map((l, i) => <span key={i} className={i === 0 ? "wf-ink b" : "wf-ink"}>{l}</span>)}
          {screen.kind === "last-shift" && (
            <>
              <span className="wf-muted">{screen.title}</span>
              {screen.lines.map((l, i) => <span key={i} className="wf-ink small">{l}</span>)}
            </>
          )}
        </div>
        {screen.kind === "ask" && <div className="wf-hint">{screen.quiet ? `Quiet until ${screen.quiet}` : "Press to answer"}</div>}
        {screen.kind === "last-shift" && <div className="wf-hint">Press for details</div>}
      </div>
    </div>
  );
}
