export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type EmployerId = "pandora" | "mcd";
export type AppId =
  | "offshift"
  | "pandora"
  | "mcd"
  | "myuq"
  | "calendar"
  | "settings"
  | "pandora-manager"
  | "mcd-manager";

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
export type Priority = "health" | "uni" | "money";
export type BodyRating = "fine" | "tired" | "wiped";
export type CheckState = "ok" | "warn" | "bad";

export interface Employer {
  id: EmployerId;
  name: string;
  site: string;
  workerApp: string;
  managerApp: string;
  manager: { name: string; initial: string };
  rate: number;
  satRate: number;
  colleagues: string[];
  closeHour: number;
}

export interface Shift {
  id: string;
  employer: EmployerId;
  day: Day;
  start: string;
  end: string;
  break?: number;
  rated?: BodyRating;
  viaOffer?: string;
  note?: string;
}

export interface UniEvent {
  id: string;
  day: Day;
  start: string;
  end: string;
  title: string;
  course: string;
  type: "tute" | "lecture" | "due";
  room?: string;
}

export type PlanCategory = "study" | "personal" | "rest" | "appointment" | "custom";
export type Importance = "flexible" | "important" | "protected";

export interface PersonalEvent {
  id: string;
  day: Day;
  start: string;
  end: string;
  title: string;
  note?: string;
  category?: PlanCategory;
  importance?: Importance;
}

export interface AltSlot {
  day: Day;
  start: string;
  end: string;
  label: string;
  nextWeek?: boolean;
}

export interface Offer {
  id: string;
  employer: EmployerId;
  day: Day;
  start: string;
  end: string;
  note: string;
  from: string;
  sentAt: string;
  status: OfferStatus;
  alt?: AltSlot;
  colleague?: string;
  reminderAt?: string;
  reminderDue?: number;
  reminded?: boolean;
  repliedAt?: string;
}

export interface Message {
  id: string;
  employer: EmployerId;
  from: "manager" | "dinda" | "system";
  text: string;
  at: string;
  offerId?: string;
}

export interface Notification {
  id: string;
  app: AppId;
  title: string;
  body: string;
  at: string;
  offerId?: string;
}

export interface SyncEntry {
  id: string;
  at: string;
  from: string;
  to: string;
  text: string;
}

export interface Checkin {
  id: string;
  shiftId: string;
  body: BodyRating;
  kit: string[];
  at: string;
}

export interface Settings {
  priority: Priority;
  essentials: number;
  rent: number;
  other: number;
  travelFromUniMin: number;
  travelRoute: string;
  protectedDay: Day;
  closesBeforeFlag: number;
  tone: Tone;
  lastWeekEarned: number;
  quietWeeksReminder: boolean;
  protectedIds?: string[];
}

export interface Check {
  key: "body" | "week" | "money";
  state: CheckState;
  text: string;
}

export interface ImpactTile {
  key: "study" | "travel" | "income" | "rest" | "personal";
  title: string;
  value: string;
  detail: string;
  state: CheckState;
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
  employer?: EmployerId;
  offerId?: string;
  warn?: string;
  category?: PlanCategory;
  importance?: Importance;
  protected?: boolean;
  status?: string;
}

export interface DayView {
  day: Day;
  date: number;
  today: boolean;
  rest: boolean;
  items: DayItem[];
}
