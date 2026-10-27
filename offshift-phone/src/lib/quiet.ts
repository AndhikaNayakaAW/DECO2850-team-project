import { minutes } from "./logic";
import { addDays, type Now } from "./time";
import type { DataSlice, Offer } from "./types";

/**
 * While the worker is on a rostered shift, a new ask waits to buzz the watch until that shift ends, because many
 * workplaces don't allow a phone or watch on the floor. Returns the end of the current shift ("21:00"), or null when
 * the watch may buzz now. An ask that starts before the shift ends (staying back tonight) never waits. The calendar
 * shows every ask straight away either way.
 */
export function quietUntil(offer: Pick<Offer, "date" | "start" | "status">, data: Pick<DataSlice, "shifts">, now: Pick<Now, "date" | "time">): string | null {
  if (offer.status !== "pending") return null;
  // Same-zone "date time" strings sort in time order, so no zone arithmetic is needed.
  const at = `${now.date} ${now.time}`;
  const askStarts = `${offer.date} ${offer.start}`;
  for (const s of data.shifts) {
    const endDate = minutes(s.end) <= minutes(s.start) ? addDays(s.date, 1) : s.date;
    const ends = `${endDate} ${s.end}`;
    if (`${s.date} ${s.start}` <= at && at < ends) return askStarts < ends ? null : s.end;
  }
  return null;
}
