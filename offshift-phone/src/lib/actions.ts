import { altSlots } from "./checks";
import { uid } from "./ids";
import { clock12, range12 } from "./logic";
import { isClock, isDateKey, nowIn, shortDate, weekdayName, whenWord } from "./time";
import type { AltSlot, DataSlice, Decision, Offer, SyncEntry } from "./types";

export interface ResponseExtras {
  alt?: AltSlot;
  colleague?: string;
  reminderMinutes?: number;
}

function logLine(at: Date, from: string, to: string, text: string, offerId?: string): SyncEntry {
  return { id: uid("y"), at: at.toISOString(), from, to, text, ...(offerId ? { offerId } : {}) };
}

/**
 * Answers an ask without touching the input: the calendar, the watch and the server all use this,
 * so a reply from any of them changes the shared week the same way.
 */
export function applyResponse(data: DataSlice, offerId: string, decision: Decision, text: string, extras: ResponseExtras = {}, at: Date = new Date()): { data: DataSlice; toast: string } | null {
  const offer = data.offers.find((o) => o.id === offerId);
  if (!offer || (offer.status !== "pending" && offer.status !== "deferred")) return null;
  const now = nowIn(data.settings.timeZone, at);
  const what = `${shortDate(offer.date)} ${range12(offer.start, offer.end)}`;
  const reply = () => [...data.messages, { id: uid("m"), offerId, from: "worker" as const, text, at: at.toISOString() }];
  let next: Offer = { ...offer, repliedAt: at.toISOString() };
  let messages = data.messages;
  let sync = data.sync;
  let shifts = data.shifts;
  let toast = "";
  if (decision === "later") {
    const mins = extras.reminderMinutes || 30;
    const due = new Date(at.getTime() + mins * 60_000);
    const clock = clock12(nowIn(data.settings.timeZone, due).time);
    next = { ...offer, status: "deferred", reminderAt: due.toISOString(), reminded: false };
    sync = [...sync, logLine(at, "Offshift", "Only you", `Reminder set for ${clock}. Nothing sent to ${offer.from}.`, offerId)];
    toast = `Reminder set for ${clock}. Nothing sent.`;
  } else if (decision === "accept") {
    next = { ...next, status: "accepted" };
    shifts = [...shifts, { id: uid("s"), date: offer.date, start: offer.start, end: offer.end, workplace: offer.workplace, viaOffer: offerId }];
    messages = reply();
    sync = [...sync, logLine(at, "Offshift", offer.from, `Took ${what} at ${offer.workplace}. Added to the week.`, offerId)];
    toast = `Sent to ${offer.from}. Added to your week.`;
  } else if (decision === "decline") {
    next = { ...next, status: "declined" };
    messages = reply();
    sync = [...sync, logLine(at, "Offshift", offer.from, `Declined ${what}.`, offerId)];
    toast = `Sent to ${offer.from}. ${weekdayName(offer.date)} stays as it is.`;
  } else if (decision === "negotiate") {
    const alt = extras.alt || altSlots(offer, data, now)[0];
    next = { ...next, status: "countered", alt };
    messages = reply();
    sync = [...sync, logLine(at, "Offshift", offer.from, alt ? `Offered ${alt.label} instead of ${what}.` : `Offered another time instead of ${what}.`, offerId)];
    toast = alt ? `Sent to ${offer.from}: ${alt.label} instead.` : `Sent to ${offer.from}.`;
  } else if (decision === "swap") {
    const who = extras.colleague?.trim() || undefined;
    next = { ...next, status: "swap-requested", colleague: who };
    messages = reply();
    sync = [...sync, logLine(at, "Offshift", offer.from, who ? `Suggested ${who} for ${what}.` : `Offered to find a swap for ${what}.`, offerId)];
    toast = `Sent to ${offer.from}. Waiting on a reply.`;
  }
  return { data: { ...data, offers: data.offers.map((o) => (o.id === offerId ? next : o)), messages, sync, shifts }, toast };
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

/** The manager's side of a counter-offer or swap, played by the team. */
export function resolveAsk(data: DataSlice, offerId: string, action: "confirm-alt" | "approve-swap", at: Date = new Date()): DataSlice {
  const offer = data.offers.find((o) => o.id === offerId);
  if (!offer) return data;
  if (action === "confirm-alt" && offer.status === "countered" && offer.alt) {
    const alt = offer.alt;
    return {
      ...data,
      offers: data.offers.map((o) => (o.id === offerId ? { ...o, status: "alt-confirmed" } : o)),
      shifts: [...data.shifts, { id: uid("s"), date: alt.date, start: alt.start, end: alt.end, workplace: offer.workplace, viaOffer: offerId }],
      messages: [...data.messages, { id: uid("m"), offerId, from: "team", text: `Thanks, ${alt.label} works.`, at: at.toISOString() }],
      sync: [...data.sync, logLine(at, offer.from, "Offshift", `${alt.label} confirmed. Added to the week.`)],
    };
  }
  if (action === "approve-swap" && offer.status === "swap-requested") {
    return {
      ...data,
      offers: data.offers.map((o) => (o.id === offerId ? { ...o, status: "swapped" } : o)),
      messages: [...data.messages, { id: uid("m"), offerId, from: "team", text: "Thanks for sorting the swap.", at: at.toISOString() }],
      sync: [...data.sync, logLine(at, offer.from, "Offshift", "Swap approved. Nothing changes in the week.")],
    };
  }
  return data;
}
