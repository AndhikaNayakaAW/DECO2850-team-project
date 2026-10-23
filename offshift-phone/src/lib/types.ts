/** A weekday, used for the columns of the week and for rest days. */
export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
/** A calendar date in the worker's zone, "2026-10-19". */
export type DateKey = string;

export type Decision = "accept" | "negotiate" | "swap" | "decline" | "later";
export type OfferStatus =
  | "pending"
  | "deferred"
  | "accepted"
  | "declined"
  | "countered"
  | "alt-confirmed"
  | "swap-requested"
  | "swapped";
export type Tone = "warm" | "plain";
export type BodyRating = "fine" | "tired" | "wiped";
export type CheckState = "ok" | "warn" | "bad";

/** A rostered shift at a workplace the worker named themselves. */
export interface Shift {
  id: string;
  date: DateKey;
  start: string;
  end: string;
  workplace: string;
  rated?: BodyRating;
  viaOffer?: string;
  note?: string;
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

export interface AltSlot {
  date: DateKey;
  start: string;
  end: string;
  label: string;
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
  alt?: AltSlot;
  colleague?: string;
  reminderAt?: string;
  reminded?: boolean;
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
  tone: Tone;
  /** Weekdays the worker keeps clear, booked like a shift. */
  restDays: Day[];
  protectedIds: string[];
  /** A shift ending at or after this clock (or past midnight) counts as a late finish. */
  lateFinish: string;
  lateFinishesBeforeFlag: number;
  timeZone: string;
}

export interface Check {
  key: "body" | "week";
  state: CheckState;
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

/** 0 reads low, 3 reads well. */
export type BodyLevel = 0 | 1 | 2 | 3;

/** What the watch reads: Body Battery, sleep, stress, resting heart rate, breathing, pulse ox and recovery time. */
export type BodySignal = "energy" | "sleep" | "stress" | "heart" | "breathing" | "pulseOx" | "recovery";

export type BodySignals = Partial<Record<BodySignal, BodyLevel>>;

/** A body reading from the worker's own watch, kept as levels and words so no raw number travels. */
export interface Wearable {
  level: BodyLevel;
  word: string;
  at: string;
  source: string;
  /** When the server got it (ISO). An old reading stops counting. */
  receivedAt?: string;
  signals?: BodySignals;
}

/** Bumped whenever the shape changes, so old saved weeks are never read as new ones. */
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
  wearable?: Wearable | null;
}
