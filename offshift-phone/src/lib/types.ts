/** A weekday, used for the columns of the week and for rest days. */
export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
/** A calendar date in the worker's zone, "2026-10-19". */
export type DateKey = string;

/** How a worker answers an ask: take the shift, turn it down, or keep it on the week to decide later. */
export type Decision = "accept" | "decline" | "later";
export type OfferStatus = "pending" | "deferred" | "accepted" | "declined";
/** How the work on a finished shift was, in work words, lowest to highest. The only rating a shift has. */
export type Effort = "light" | "steady" | "busy" | "hard";
export type CheckState = "ok" | "warn" | "bad";

/** A rostered shift at a workplace the worker named themselves. */
export interface Shift {
  id: string;
  date: DateKey;
  start: string;
  end: string;
  workplace: string;
  /** How the work was, from the watch's check-in after the shift or from the calendar. */
  effort?: Effort;
  /** The worker skipped the check-in: never read as a rating, and never asked again. */
  effortSkipped?: boolean;
  viaOffer?: string;
  note?: string;
  /** Heart rate and stress during this shift, from the watch, while the worker shares. */
  body?: ShiftBody;
}

/** A class, or something due. */
export interface UniEvent {
  id: string;
  date: DateKey;
  start: string;
  end: string;
  title: string;
  type: "class" | "due";
}

export type PlanCategory = "study" | "personal" | "rest" | "appointment" | "custom";
export type Importance = "flexible" | "important" | "protected";

export interface PersonalEvent {
  id: string;
  date: DateKey;
  start: string;
  end: string;
  title: string;
  note?: string;
  category?: PlanCategory;
  importance?: Importance;
}


/** A shift ask, sent by the research team on behalf of a manager. */
export interface Offer {
  id: string;
  from: string;
  workplace: string;
  date: DateKey;
  start: string;
  end: string;
  note: string;
  sentAt: string;
  status: OfferStatus;
  repliedAt?: string;
}

/** A line in the conversation about an ask: the manager's side is played by the team. */
export interface Message {
  id: string;
  offerId?: string;
  from: "team" | "worker";
  text: string;
  at: string;
}

export interface SyncEntry {
  id: string;
  at: string;
  from: string;
  to: string;
  text: string;
  /** The ask this line is about, when it is about one. */
  offerId?: string;
}

export interface Settings {
  /** The worker's first name, or empty. */
  name: string;
  /** Weekdays the worker keeps clear, booked like a shift. */
  restDays: Day[];
  protectedIds: string[];
  /** A shift ending at or after this clock (or past midnight) counts as a late finish. */
  lateFinish: string;
  lateFinishesBeforeFlag: number;
  timeZone: string;
}

export interface Check {
  key: "body" | "week" | "past";
  /** "info" carries no judgement: the past shifts are shown, never graded. */
  state: CheckState | "info";
  text: string;
}

export type ItemKind = "uni" | "shift" | "offer" | "personal" | "rest" | "due" | "travel" | "boundary";

export interface DayItem {
  id: string;
  kind: ItemKind;
  start: string;
  end: string;
  label: string;
  sub?: string;
  source: string;
  workplace?: string;
  /** Which of the worker's workplaces, for its colour: 0 for the first one named, 1 for the next. */
  workplaceIndex?: number;
  offerId?: string;
  /** An ask the worker kept for later: drawn see-through until they press it and decide. */
  later?: boolean;
  /** A shift's work rating, which colours its block. */
  effort?: Effort;
  /** A shift's heart rate and stress, 15 minutes at a time, drawn along its block. */
  body?: ShiftBody;
  warn?: string;
  category?: PlanCategory;
  importance?: Importance;
  protected?: boolean;
  status?: string;
}

export interface DayView {
  day: Day;
  date: DateKey;
  dayNum: number;
  today: boolean;
  rest: boolean;
  items: DayItem[];
}

/** How much of a signal there was in one 15-minute block of a shift: 0 the least, 3 the most. */
export type Load = 0 | 1 | 2 | 3;

/** The two signals Offshift reads during a shift. */
export type ShiftSignal = "stress" | "heart";

/**
 * What the watch read during one shift, 15 minutes at a time from its start, as levels and never numbers.
 * Null where the watch had no reading (off the wrist, or moving too much to read stress).
 */
export interface ShiftBody {
  /** When the server got it (ISO). */
  receivedAt: string;
  /** Garmin stress, in Garmin's own bands: 0 resting, 1 low, 2 medium, 3 high. */
  stress: (Load | null)[];
  /** Heart rate against the worker's own resting and maximum (heart-rate reserve): 0 very light, 1 light, 2 moderate, 3 vigorous. */
  heart: (Load | null)[];
}

/**
 * Bumped only when an older saved week can't be read as a current one. A field that was removed (the all-day
 * `wearable` and `bodyDays`, the old `rated`) doesn't need a bump: cleanData drops it.
 */
export const SCHEMA = 2;

/** Everything that syncs between the calendar, the team API, the watch and the server. */
export interface DataSlice {
  schema: number;
  sessionStartedAt: string;
  shifts: Shift[];
  uni: UniEvent[];
  personal: PersonalEvent[];
  offers: Offer[];
  messages: Message[];
  sync: SyncEntry[];
  settings: Settings;
}
