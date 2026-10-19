import { uid } from "./ids";
import { DEFAULT_TIME_ZONE, addDays, nowIn, weekStart } from "./time";
import { SCHEMA, type DataSlice, type Settings } from "./types";
import { cleanData } from "./validate";

export function defaultSettings(): Settings {
  return { name: "", tone: "warm", restDays: [], protectedIds: [], lateFinish: "21:00", lateFinishesBeforeFlag: 2, timeZone: DEFAULT_TIME_ZONE };
}

/** A clean calendar for the next participant: nothing from the last session carries over. */
export function emptyData(at: Date = new Date()): DataSlice {
  return { schema: SCHEMA, sessionStartedAt: at.toISOString(), shifts: [], uni: [], personal: [], offers: [], messages: [], sync: [], settings: defaultSettings(), wearable: null };
}

/** True for a well-formed week in the current shape; anything older or malformed is treated as no data at all. */
export function isCurrent(data: unknown): data is DataSlice {
  return cleanData(data) !== null;
}

/**
 * A practice week around the current week, for training the team and for demos.
 * Generic workplaces and no one's name; a participant only sees it if the team loads it.
 */
export function exampleWeek(at: Date = new Date()): DataSlice {
  const today = nowIn(DEFAULT_TIME_ZONE, at).date;
  const mon = weekStart(today);
  const d = (i: number) => addDays(mon, i);
  const data = emptyData(at);
  return {
    ...data,
    settings: { ...data.settings, restDays: ["Sun"] },
    shifts: [
      { id: uid("s"), date: d(0), start: "14:00", end: "19:00", workplace: "Café" },
      { id: uid("s"), date: d(1), start: "16:00", end: "21:30", workplace: "Supermarket" },
      { id: uid("s"), date: d(2), start: "12:00", end: "16:00", workplace: "Café" },
      { id: uid("s"), date: d(4), start: "10:00", end: "16:00", workplace: "Café" },
      { id: uid("s"), date: d(5), start: "09:00", end: "17:00", workplace: "Supermarket" },
    ],
    uni: [
      { id: uid("u"), date: d(0), start: "10:00", end: "12:00", title: "Lecture", type: "class" },
      { id: uid("u"), date: d(1), start: "09:00", end: "11:00", title: "Lecture", type: "class" },
      { id: uid("u"), date: d(3), start: "13:00", end: "15:00", title: "Tutorial", type: "class" },
      { id: uid("u"), date: d(4), start: "23:59", end: "23:59", title: "Assignment", type: "due" },
    ],
    personal: [
      { id: uid("p"), date: d(1), start: "18:00", end: "19:00", title: "Call home", category: "personal", importance: "important" },
      { id: uid("p"), date: d(3), start: "19:30", end: "21:30", title: "Dinner with a friend", category: "personal", importance: "flexible" },
      { id: uid("p"), date: d(5), start: "18:30", end: "19:30", title: "Gym", category: "personal", importance: "flexible" },
    ],
  };
}
