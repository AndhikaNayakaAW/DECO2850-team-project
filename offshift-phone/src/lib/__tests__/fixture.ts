import { emptyData } from "@/lib/session";
import type { DataSlice, Offer } from "@/lib/types";

/** Thursday 22 October 2026, 1:02 pm in Brisbane. */
export const AT = new Date("2026-10-22T03:02:00Z");
export const NOW = { date: "2026-10-22", time: "13:02" };

/** A realistic week, 19 to 25 October 2026, for tests only. Nothing like it ships in the app. */
export function week(): DataSlice {
  const d = emptyData(AT);
  return {
    ...d,
    settings: { ...d.settings, name: "Sam", restDays: ["Sun"] },
    shifts: [
      { id: "s-mon", date: "2026-10-19", start: "14:00", end: "19:00", workplace: "Café" },
      { id: "s-tue", date: "2026-10-20", start: "16:00", end: "21:00", workplace: "Café", rated: "tired" },
      { id: "s-wed", date: "2026-10-21", start: "12:00", end: "16:00", workplace: "Supermarket" },
      { id: "s-fri", date: "2026-10-23", start: "10:00", end: "16:00", workplace: "Café" },
      { id: "s-sat", date: "2026-10-24", start: "09:00", end: "17:00", workplace: "Supermarket" },
    ],
    uni: [
      { id: "u-thu", date: "2026-10-22", start: "13:00", end: "15:00", title: "Tutorial", type: "class" },
      { id: "u-due", date: "2026-10-23", start: "23:59", end: "23:59", title: "Report", type: "due" },
    ],
    personal: [
      { id: "p-tue", date: "2026-10-20", start: "18:00", end: "19:00", title: "Call home", category: "personal", importance: "important" },
      { id: "p-thu", date: "2026-10-22", start: "19:30", end: "21:30", title: "Dinner with a friend", category: "personal", importance: "flexible" },
    ],
    offers: [ask()],
  };
}

export function ask(patch: Partial<Offer> = {}): Offer {
  return { id: "o-thu", from: "Alex", workplace: "Café", date: "2026-10-22", start: "16:00", end: "21:00", note: "Hi Sam, Mia's sick. Any chance you could do 4-9 tonight?", sentAt: "2026-10-22T02:41:00.000Z", status: "pending", ...patch };
}
