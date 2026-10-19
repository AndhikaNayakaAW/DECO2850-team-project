import type { BodyLevel, BodySignal, BodySignals, Wearable } from "./types";

/** Every signal the watch can share, in the order the watch and the calendar list them. */
export const BODY_SIGNALS: BodySignal[] = ["energy", "sleep", "stress", "heart", "breathing", "pulseOx", "recovery"];

export const SIGNAL_LABELS: Record<BodySignal, string> = {
  energy: "Energy",
  sleep: "Sleep",
  stress: "Stress",
  heart: "Heart",
  breathing: "Breathing",
  pulseOx: "Pulse ox",
  recovery: "Recovery",
};

/** One word per level, 0 to 3. Stress and sleep use Garmin's own bands. The watch app keeps the same table. */
const WORDS: Record<BodySignal, [string, string, string, string]> = {
  energy: ["Very low", "Running low", "Steady", "Plenty"],
  sleep: ["Very poor", "Poor", "Fair", "Good"],
  stress: ["High", "Medium", "Low", "Resting"],
  heart: ["Well above usual", "Above usual", "Slightly above usual", "As usual"],
  breathing: ["Very fast", "Fast", "Steady", "Calm"],
  pulseOx: ["Very low", "Low", "Slightly low", "Good"],
  recovery: ["Long way off", "Still recovering", "Recovering", "Recovered"],
};

/**
 * How the steady signals read mid-sentence when they are low (level 0, then level 1). Breathing and
 * pulse ox are single moments that change when you walk upstairs, so they show but never speak for the body.
 */
const PHRASES: Partial<Record<BodySignal, [string, string]>> = {
  sleep: ["a very poor night's sleep", "a poor night's sleep"],
  stress: ["high stress", "medium stress"],
  heart: ["a resting heart rate well above your usual", "a resting heart rate above your usual"],
  recovery: ["a long recovery still to go", "recovery still under way"],
};

/** The overall reading, in the words the calendar has always used. */
export const OVERALL_WORDS: Record<BodyLevel, string> = {
  0: "Very low",
  1: "Running low",
  2: "Steady",
  3: "Plenty of energy",
};

export function signalWord(signal: BodySignal, level: BodyLevel): string {
  return WORDS[signal][level];
}

/**
 * The overall reading is Body Battery, which Garmin already builds from sleep, stress,
 * heart-rate variability and activity. Without it the watch isn't being worn, so there is none.
 */
export function overallLevel(signals: BodySignals): BodyLevel | null {
  return signals.energy ?? null;
}

function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** The signals reading low, besides energy, as one phrase: "a poor night's sleep and medium stress". */
export function bodyNotes(signals: BodySignals): string {
  const low: string[] = [];
  for (const k of BODY_SIGNALS) {
    const phrase = PHRASES[k];
    const v = signals[k];
    if (phrase && (v === 0 || v === 1)) low.push(phrase[v]);
  }
  return joinAnd(low);
}

/** What the watch reads, stated as a fact: "Your watch reads running low, with a poor night's sleep." */
export function bodySentence(w: Wearable): string {
  const notes = w.signals ? bodyNotes(w.signals) : "";
  return `Your watch reads ${w.word.toLowerCase()}${notes ? `, with ${notes}` : ""}.`;
}

/** The colour of a reading: the overall level sets it, and any other signal reading low makes it at least amber. */
export function bodyState(w: Wearable): "ok" | "warn" | "bad" {
  const s = w.level === 0 ? "bad" : w.level === 1 ? "warn" : "ok";
  return s === "ok" && w.signals && bodyNotes(w.signals) ? "warn" : s;
}
