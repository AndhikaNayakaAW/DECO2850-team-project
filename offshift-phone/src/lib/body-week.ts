/**
 * The body band along the floor of each day in the 3D week. Rationale and sources:
 * docs/design/2026-10-23-shift-check-in.md (section 6) and docs/research/2026-10-23-biometrics-on-the-calendar.md.
 */
import { signalWord } from "./body";
import { nowIn } from "./time";
import type { BandDay, BodyDay, BodyLevel, BodySignal, BodySignals, DataSlice, DateKey } from "./types";

/** The signals the band can show, chosen by the worker. Pulse ox and breathing are left out: they are single moments, and the watch's pulse ox is unreliable. */
export const BAND_SIGNALS = ["energy", "stress", "heart"] as const satisfies readonly BodySignal[];
export type BandSignal = (typeof BAND_SIGNALS)[number];

/** What darker means for each, so the band reads "more of what it names". */
export const BAND_MEANING: Record<BandSignal, string> = { energy: "more energy", stress: "more stress", heart: "further above your usual resting rate" };

/** One neutral grey, evenly darker. No hue, so it reads the same with colour-blind vision and never competes with the shift colours. */
export const BAND_COLOUR = ["#E2E2DE", "#B9BAB4", "#8E908A", "#62645F"] as const;

/** How many days the server keeps: four weeks. */
const KEEP_DAYS = 28;
/** Today's reading stops counting as current after this, as in the Body card. */
const STALE_HOURS = 12;

/** Today's latest reading replaces the earlier one; a signal missing from it keeps its earlier level. */
export function recordBodyDay(days: BodyDay[], date: DateKey, at: string, receivedAt: Date, signals: BodySignals): BodyDay[] {
  const earlier = days.find((d) => d.date === date);
  const today: BodyDay = { date, at, receivedAt: receivedAt.toISOString(), signals: { ...earlier?.signals, ...signals } };
  return [...days.filter((d) => d.date !== date), today].sort((a, b) => a.date.localeCompare(b.date)).slice(-KEEP_DAYS);
}

/** Level 3 is always the settled end (plenty of energy, resting, as usual), so stress and heart turn round to read "darker is more". */
function shadeOf(signal: BandSignal, level: BodyLevel): BodyLevel {
  return (signal === "energy" ? level : 3 - level) as BodyLevel;
}

/** The band for these dates: empty when the worker has never shared, so nothing is drawn. */
export function bodyBand(data: DataSlice, dates: DateKey[], signal: BandSignal, at: Date = new Date()): BandDay[] {
  const days = data.bodyDays ?? [];
  if (!days.length) return [];
  const today = nowIn(data.settings.timeZone, at).date;
  return dates.map((date) => {
    const day = days.find((d) => d.date === date);
    const sleep = day?.signals.sleep;
    const overnight = sleep === undefined ? undefined : { shade: sleep, word: signalWord("sleep", sleep) };
    const level = day?.signals[signal];
    if (!day || level === undefined) return { date, state: "none", ...(overnight ? { overnight } : {}) };
    const old = date === today && at.getTime() - Date.parse(day.receivedAt) > STALE_HOURS * 3_600_000;
    return { date, state: old ? "stale" : "reading", shade: shadeOf(signal, level), word: signalWord(signal, level), ...(overnight ? { overnight } : {}) };
  });
}
