import { altSlots } from "./checks";
import { uid } from "./ids";
import { DAY_NAMES, addMinutesToClock, range24 } from "./logic";
import { EMPLOYERS } from "./scenario";
import type { AltSlot, DataSlice, Decision, Offer, SyncEntry } from "./types";

export interface ResponseExtras {
  alt?: AltSlot;
  colleague?: string;
  reminderMinutes?: number;
}

/**
 * Answers an ask without touching the input: the phone, the calendar and the server all use this,
 * so a reply from any of them changes the shared week the same way.
 */
export function applyResponse(data: DataSlice, offerId: string, decision: Decision, text: string, extras: ResponseExtras = {}, now: number = Date.now()): { data: DataSlice; toast: string } | null {
  const offer = data.offers.find((o) => o.id === offerId);
  if (!offer) return null;
  const emp = EMPLOYERS[offer.employer];
  const at = addMinutesToClock(data.clock, 1);
  const log = (from: string, to: string, line: string): SyncEntry => ({ id: uid("y"), at, from, to, text: line });
  const reply = () => [...data.messages, { id: uid("m"), employer: offer.employer, from: "dinda" as const, text, at, offerId }];
  let next: Offer = { ...offer, repliedAt: at };
  let messages = data.messages;
  let sync = data.sync;
  let shifts = data.shifts;
  let toast = "";
  if (decision === "later") {
    const mins = extras.reminderMinutes || 30;
    next = { ...next, status: "deferred", reminderAt: addMinutesToClock(data.clock, mins), reminderDue: now + Math.min(mins, 120) * 250, reminded: false };
    sync = [...sync, log("Offshift", "Only you", `Reminder set for ${next.reminderAt}. Nothing sent to ${emp.name}.`)];
    toast = `Reminder set for ${next.reminderAt}.`;
  } else if (decision === "accept") {
    next = { ...next, status: "accepted" };
    shifts = [...shifts, { id: uid("s"), employer: offer.employer, day: offer.day, start: offer.start, end: offer.end, viaOffer: offerId }];
    messages = reply();
    sync = [
      ...sync,
      log("Offshift", emp.workerApp, `Reply sent as Dinda: accepted ${offer.day} ${range24(offer.start, offer.end)}.`),
      log(emp.workerApp, "Offshift · Calendar", `${offer.day} ${range24(offer.start, offer.end)} booked, travel time added around it.`),
    ];
    toast = `Sent to ${emp.manager.name}. Shift added to your week.`;
  } else if (decision === "decline") {
    next = { ...next, status: "declined" };
    messages = reply();
    sync = [...sync, log("Offshift", emp.workerApp, `Reply sent as Dinda: declined ${offer.day} ${range24(offer.start, offer.end)}.`)];
    toast = `Sent to ${emp.manager.name}. ${DAY_NAMES[offer.day]} stays yours.`;
  } else if (decision === "negotiate") {
    const alt = extras.alt || altSlots(offer, data)[0];
    next = { ...next, status: "countered", alt };
    messages = reply();
    sync = [...sync, log("Offshift", emp.workerApp, `Reply sent as Dinda: offered ${alt.label} instead.`)];
    toast = `Sent to ${emp.manager.name}: ${alt.label}.`;
  } else if (decision === "swap") {
    const who = extras.colleague || emp.colleagues[1];
    next = { ...next, status: "swap-requested", colleague: who };
    messages = reply();
    sync = [...sync, log("Offshift", emp.workerApp, `Reply sent as Dinda: swap with ${who} requested.`)];
    toast = `Sent to ${emp.manager.name}. Waiting on a reply.`;
  }
  return {
    data: {
      ...data,
      clock: at,
      offers: data.offers.map((o) => (o.id === offerId ? next : o)),
      messages,
      sync,
      shifts,
      notifications: data.notifications.filter((n) => n.offerId !== offerId || decision === "later"),
    },
    toast,
  };
}
