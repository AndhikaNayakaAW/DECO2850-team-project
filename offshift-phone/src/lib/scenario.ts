import type {
  Day,
  Employer,
  EmployerId,
  Message,
  Notification,
  Offer,
  PersonalEvent,
  Settings,
  Shift,
  SyncEntry,
  UniEvent,
} from "./types";

/** A fixed scenario clock keeps the demo stable: it is Thursday lunchtime. */
export const SCENARIO = {
  today: "Thu" as Day,
  clock: "13:02",
  weekLabel: "Week of 14 Sep",
  fortnightLabel: "Fortnight 7–20 Sep",
  month: "September",
  monthShort: "Sep",
  year: 2026,
  dates: { Mon: 14, Tue: 15, Wed: 16, Thu: 17, Fri: 18, Sat: 19, Sun: 20 } as Record<Day, number>,
};

export const PERSON = {
  name: "Dinda",
  full: "Dinda Pratiwi",
  initial: "D",
  uni: "The University of Queensland",
  studentId: "s4812093",
};

export const EMPLOYERS: Record<EmployerId, Employer> = {
  pandora: {
    id: "pandora",
    name: "Pandora",
    site: "Queen Street",
    workerApp: "Pandora Team",
    managerApp: "Pandora Manager",
    manager: { name: "Jess", initial: "J" },
    rate: 32,
    satRate: 40,
    colleagues: ["Mia", "Priya", "Tom"],
    closeHour: 21,
  },
  mcd: {
    id: "mcd",
    name: "McDonald's",
    site: "Indooroopilly",
    workerApp: "McDonald's Crew",
    managerApp: "McDonald's Manager",
    manager: { name: "Raj", initial: "R" },
    rate: 26,
    satRate: 32.5,
    colleagues: ["Ahmed", "Lucy", "Ken"],
    closeHour: 22,
  },
};

export const EMPLOYER_IDS: EmployerId[] = ["pandora", "mcd"];

export const initialShifts: Shift[] = [
  { id: "s-mon", employer: "pandora", day: "Mon", start: "14:00", end: "19:00", rated: "fine" },
  { id: "s-tue", employer: "pandora", day: "Tue", start: "16:00", end: "21:00", rated: "tired", note: "close" },
  { id: "s-wed", employer: "mcd", day: "Wed", start: "12:00", end: "16:00", rated: "fine", note: "lunch rush" },
  { id: "s-fri", employer: "pandora", day: "Fri", start: "10:00", end: "16:00" },
  { id: "s-sat", employer: "pandora", day: "Sat", start: "09:00", end: "17:00", note: "Saturday rate" },
];

export const initialUni: UniEvent[] = [
  { id: "u-mon", day: "Mon", start: "10:00", end: "12:00", title: "Tute", course: "DECO2850", type: "tute", room: "78-208" },
  { id: "u-wed", day: "Wed", start: "09:00", end: "11:00", title: "Lecture", course: "INFS2200", type: "lecture", room: "50-T105" },
  { id: "u-thu", day: "Thu", start: "13:00", end: "15:00", title: "Tute", course: "INFS2200", type: "tute", room: "78-344" },
  { id: "u-due", day: "Fri", start: "23:59", end: "23:59", title: "Report due", course: "DECO2850", type: "due" },
];

export const initialPersonal: PersonalEvent[] = [
  { id: "p-wed", day: "Wed", start: "18:00", end: "19:00", title: "Call home" },
  { id: "p-thu", day: "Thu", start: "19:30", end: "21:30", title: "Dinner with Ayu", note: "Visiting from Melbourne" },
  { id: "p-sat", day: "Sat", start: "18:30", end: "19:30", title: "Pilates" },
];

export const initialOffers: Offer[] = [
  {
    id: "o-jess-thu",
    employer: "pandora",
    day: "Thu",
    start: "16:00",
    end: "21:00",
    note: "Hey Dinda, Mia's sick. Any chance you could do 4–9 tonight?",
    from: "Jess",
    sentAt: "12:41",
    status: "pending",
  },
];

export const initialMessages: Message[] = [
  { id: "m1", employer: "pandora", from: "manager", text: "Roster for 14–20 Sep is up. Thanks for taking the Saturday!", at: "Sun 18:05" },
  { id: "m2", employer: "pandora", from: "dinda", text: "No worries, see you Monday.", at: "Sun 18:20" },
  { id: "m3", employer: "pandora", from: "manager", text: "Hey Dinda, Mia's sick. Any chance you could do 4–9 tonight?", at: "12:41", offerId: "o-jess-thu" },
  { id: "m4", employer: "mcd", from: "manager", text: "Wed lunch 12–4 confirmed. Cheers Dinda.", at: "Mon 09:10" },
  { id: "m5", employer: "mcd", from: "dinda", text: "Thanks Raj, see you then.", at: "Mon 09:32" },
];

export const initialNotifications: Notification[] = [
  {
    id: "n1",
    app: "offshift",
    title: "Offshift",
    body: "Jess's ask is in your week. Tute ends 3, dinner with Ayu at 7:30. Think it through when you're ready.",
    at: "12:41",
    offerId: "o-jess-thu",
  },
  {
    id: "n2",
    app: "pandora",
    title: "Pandora Team",
    body: "Jess: Hey Dinda, Mia's sick. Any chance you could do 4–9 tonight?",
    at: "12:41",
    offerId: "o-jess-thu",
  },
  { id: "n3", app: "myuq", title: "myUQ", body: "INFS2200 tute today 1–3 pm has moved to 78-344.", at: "08:15" },
];

export const initialSync: SyncEntry[] = [
  { id: "y1", at: "Sun 18:05", from: "Pandora Manager", to: "Pandora Team · Offshift", text: "Roster 14–20 Sep published. 4 shifts synced." },
  { id: "y2", at: "Mon 09:10", from: "McDonald's Manager", to: "McDonald's Crew · Offshift", text: "Wed 12:00–16:00 confirmed." },
  { id: "y3", at: "Mon 07:00", from: "myUQ", to: "Offshift", text: "Timetable and due dates for week 8 synced." },
  { id: "y4", at: "Tue 21:14", from: "Offshift", to: "Only you", text: "Check-in after Tuesday's close: Tired. Kept private." },
  { id: "y5", at: "12:41", from: "Pandora Manager", to: "Pandora Team · Offshift", text: "Shift offer from Jess: Thu 16:00–21:00." },
];

export const initialSettings: Settings = {
  priority: "health",
  essentials: 760,
  rent: 520,
  other: 240,
  travelFromUniMin: 35,
  travelRoute: "bus 412",
  protectedDay: "Sun",
  closesBeforeFlag: 2,
  tone: "warm",
  lastWeekEarned: 100,
  quietWeeksReminder: true,
};

export const RECOVERY_KIT = ["Buy the favourite meal", "Early night", "Call home", "Stretch", "Nothing, I'm good"];

/** Static roster for colleagues so the manager view looks like a real week. */
export const COLLEAGUE_ROSTER: Record<EmployerId, Record<string, Partial<Record<Day, string>>>> = {
  pandora: {
    Mia: { Mon: "09–14", Tue: "09–14", Thu: "16–21", Sat: "12–17" },
    Priya: { Wed: "14–19", Fri: "16–21", Sun: "10–16" },
    Tom: { Mon: "16–21", Wed: "16–21", Sat: "09–17", Sun: "10–16" },
  },
  mcd: {
    Ahmed: { Mon: "17–22", Wed: "17–22", Fri: "17–22", Sun: "10–16" },
    Lucy: { Tue: "12–16", Thu: "12–16", Sat: "10–16" },
    Ken: { Mon: "06–12", Thu: "06–12", Fri: "06–12", Sun: "06–12" },
  },
};
