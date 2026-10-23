import { uid } from "./ids";
import { range12 } from "./logic";
import { isClock, isDateKey, nowIn, shortDate, weekdayName, whenWord } from "./time";
import type { DataSlice, Decision, Offer, SyncEntry } from "./types";

function logLine(at: Date, from: string, to: string, text: string, offerId?: string): SyncEntry {
  return { id: uid("y"), at: at.toISOString(), from, to, text, ...(offerId ? { offerId } : {}) };
}

/**
 * Answers an ask without touching the input: the calendar, the watch and the server all use this,
 * so an answer from any of them changes the shared week the same way. No answer sends a message.
 */
export function applyResponse(data: DataSlice, offerId: string, decision: Decision, at: Date = new Date()): { data: DataSlice; toast: string } | null {
  const offer = data.offers.find((o) => o.id === offerId);
  if (!offer || (offer.status !== "pending" && offer.status !== "deferred")) return null;
  const what = `${shortDate(offer.date)} ${range12(offer.start, offer.end)}`;
  let next: Offer;
  let shifts = data.shifts;
  let line: string;
  let toast: string;
  if (decision === "accept") {
    next = { ...offer, status: "accepted", repliedAt: at.toISOString() };
    shifts = [...shifts, { id: uid("s"), date: offer.date, start: offer.start, end: offer.end, workplace: offer.workplace, viaOffer: offerId }];
    line = `Took ${what} at ${offer.workplace}. Added to the week.`;
    toast = `Added to your week.`;
  } else if (decision === "decline") {
    next = { ...offer, status: "declined", repliedAt: at.toISOString() };
    line = `Declined ${what}.`;
    toast = `Declined. ${weekdayName(offer.date)} stays as it is.`;
  } else if (decision === "later") {
    next = { ...offer, status: "deferred" };
    line = `Kept ${what} for later.`;
    toast = "Kept for later. Press it on your week when you're ready.";
  } else {
    return null;
  }
  // Deciding later is the worker's own business: the team view never learns of it.
  const to = decision === "later" ? "Only you" : offer.from;
  return { data: { ...data, offers: data.offers.map((o) => (o.id === offerId ? next : o)), shifts, sync: [...data.sync, logLine(at, "Offshift", to, line, offerId)] }, toast };
}

/** Undo for an answer: the ask waits again, and a shift it put on the week comes off. */
export function unanswer(data: DataSlice, offerId: string, at: Date = new Date()): DataSlice {
  const offer = data.offers.find((o) => o.id === offerId);
  if (!offer || offer.status === "pending") return data;
  const { repliedAt: _, ...waiting } = offer;
  return {
    ...data,
    offers: data.offers.map((o) => (o.id === offerId ? { ...waiting, status: "pending" } : o)),
    shifts: data.shifts.filter((s) => s.viaOffer !== offerId),
    sync: [...data.sync, logLine(at, "Offshift", offer.from, `Answer undone. ${shortDate(offer.date)} ${range12(offer.start, offer.end)} is waiting again.`, offerId)],
  };
}

export interface AskInput {
  from: string;
  workplace: string;
  date: string;
  start: string;
  end: string;
  note?: string;
}

/** What is wrong with an ask before it is sent, or null when it is fine. Pass now to refuse times already gone. */
export function askProblem(input: AskInput, now?: { date: string; time: string }): string | null {
  const from = typeof input.from === "string" ? input.from.trim() : "";
  const workplace = typeof input.workplace === "string" ? input.workplace.trim() : "";
  if (!from) return "Who is asking?";
  if (from.length > 40) return "Keep the name under 40 characters.";
  if (!workplace) return "Which workplace is it for?";
  if (workplace.length > 80) return "Keep the workplace under 80 characters.";
  if (!isDateKey(input.date)) return "Pick a date.";
  if (now && input.date < now.date) return "That date has passed.";
  if (!isClock(input.start) || !isClock(input.end)) return "Pick a start and finish time.";
  if (now && input.date === now.date && input.start <= now.time) return "That time has passed.";
  if (input.start === input.end) return "The shift needs a length.";
  if (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 1000)) return "Keep the message under 1000 characters.";
  return null;
}

/** The research team, playing the manager, sends an ask to the worker's calendar and watch. */
export function sendAsk(data: DataSlice, input: AskInput, at: Date = new Date()): { data: DataSlice; id: string } {
  const now = nowIn(data.settings.timeZone, at);
  const id = uid("o");
  const note = input.note?.trim() || `Hi${data.settings.name ? ` ${data.settings.name}` : ""}, any chance you could cover ${whenWord(input.date, input.start, now)}, ${range12(input.start, input.end)}?`;
  const offer: Offer = { id, from: input.from.trim(), workplace: input.workplace.trim(), date: input.date, start: input.start, end: input.end, note, sentAt: at.toISOString(), status: "pending" };
  return {
    id,
    data: {
      ...data,
      offers: [...data.offers, offer],
      messages: [...data.messages, { id: uid("m"), offerId: id, from: "team", text: note, at: at.toISOString() }],
      sync: [...data.sync, logLine(at, offer.from, "Offshift", `Ask for ${shortDate(offer.date)} ${range12(offer.start, offer.end)} at ${offer.workplace}.`)],
    },
  };
}
