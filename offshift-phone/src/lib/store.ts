import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { altSlots, offerChecks, replyDraft, draftFor } from "./checks";
import { DAY_NAMES, addMinutesToClock, range12, range24 } from "./logic";
import {
  EMPLOYERS,
  SCENARIO,
  initialMessages,
  initialNotifications,
  initialOffers,
  initialPersonal,
  initialSettings,
  initialShifts,
  initialSync,
  initialUni,
} from "./scenario";
import type {
  AltSlot,
  AppId,
  BodyRating,
  Checkin,
  Day,
  Decision,
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

export type OffshiftScreen = "week" | "offer" | "reply" | "checkin" | "money" | "me";

export interface DataSlice {
  clock: string;
  shifts: Shift[];
  uni: UniEvent[];
  personal: PersonalEvent[];
  offers: Offer[];
  messages: Message[];
  notifications: Notification[];
  sync: SyncEntry[];
  settings: Settings;
  checkins: Checkin[];
}

export interface UISlice {
  locked: boolean;
  page: number;
  app: AppId | null;
  offshiftScreen: OffshiftScreen;
  offerId: string | null;
  decision: Decision | null;
  alt: AltSlot | null;
  colleague: string | null;
  banner: Notification | null;
  toast: string | null;
  toastKey: number;
  sheet: { kind: "plan"; day?: Day } | null;
}

export interface Actions {
  openSheet: (sheet: UISlice["sheet"]) => void;
  closeSheet: () => void;
  fireReminders: () => void;
  unlock: () => void;
  lock: () => void;
  goHome: () => void;
  openApp: (app: AppId, params?: { screen?: OffshiftScreen; offerId?: string }) => void;
  setPage: (page: number) => void;
  setOffshiftScreen: (screen: OffshiftScreen, offerId?: string | null) => void;
  chooseDecision: (decision: Decision, extras?: { alt?: AltSlot; colleague?: string }) => void;
  dismissBanner: () => void;
  showToast: (text: string) => void;
  clearToast: () => void;
  sendOffer: (employer: EmployerId, offer: { day: Day; start: string; end: string; note: string }) => void;
  publishShift: (employer: EmployerId, shift: { day: Day; start: string; end: string; note?: string }) => void;
  respondToOffer: (offerId: string, decision: Decision, text: string, extras?: { alt?: AltSlot; colleague?: string; reminderMinutes?: number }) => void;
  managerResolve: (offerId: string, action: "confirm-alt" | "approve-swap") => void;
  sendMessage: (employer: EmployerId, from: Message["from"], text: string) => void;
  rateShift: (shiftId: string, body: BodyRating, kit: string[]) => void;
  addPersonal: (event: { day: Day; start: string; end: string; title: string; note?: string; category?: PersonalEvent["category"]; importance?: PersonalEvent["importance"] }) => string;
  updatePersonal: (id: string, patch: Partial<Pick<PersonalEvent, "day" | "start" | "end" | "title" | "importance" | "category">>) => void;
  setProtected: (id: string, on: boolean) => void;
  notePrivate: (text: string) => void;
  removePersonal: (id: string) => void;
  movePersonal: (id: string, day: Day) => void;
  removeShift: (id: string) => void;
  removeUni: (id: string) => void;
  restore: (kind: "shift" | "uni" | "personal", item: Shift | UniEvent | PersonalEvent) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  resetDemo: () => void;
}

export type Store = DataSlice & UISlice & Actions;

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

function copy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function initialData(): DataSlice {
  return {
    clock: SCENARIO.clock,
    shifts: copy(initialShifts),
    uni: copy(initialUni),
    personal: copy(initialPersonal),
    offers: copy(initialOffers),
    messages: copy(initialMessages),
    notifications: copy(initialNotifications),
    sync: copy(initialSync),
    settings: copy(initialSettings),
    checkins: [],
  };
}

const initialUI: UISlice = {
  locked: true,
  page: 0,
  app: null,
  offshiftScreen: "week",
  offerId: null,
  decision: null,
  alt: null,
  colleague: null,
  banner: null,
  toast: null,
  toastKey: 0,
  sheet: null,
};

export const DATA_KEYS: (keyof DataSlice)[] = ["clock", "shifts", "uni", "personal", "offers", "messages", "notifications", "sync", "settings", "checkins"];

export function pickData(s: DataSlice): DataSlice {
  return Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as DataSlice;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const stamp = (s: Store, minutesLater = 1) => addMinutesToClock(s.clock, minutesLater);
      const log = (s: Store, at: string, from: string, to: string, text: string): SyncEntry[] => [...s.sync, { id: uid("y"), at, from, to, text }];

      return {
        ...initialData(),
        ...initialUI,

        openSheet: (sheet) => set({ sheet }),
        closeSheet: () => set({ sheet: null }),
        fireReminders: () =>
          set((s) => {
            const now = Date.now();
            const due = s.offers.filter((o) => o.status === "deferred" && o.reminderDue && o.reminderDue <= now && !o.reminded);
            if (!due.length || s.locked) return {};
            const o = due[0];
            const emp = EMPLOYERS[o.employer];
            const note: Notification = {
              id: uid("n"),
              app: "offshift",
              title: "Offshift",
              body: `Still deciding? ${o.from}'s ask for ${o.day === SCENARIO.today ? "tonight" : DAY_NAMES[o.day]}, ${range12(o.start, o.end)}.`,
              at: o.reminderAt || s.clock,
              offerId: o.id,
            };
            return {
              offers: s.offers.map((x) => (x.id === o.id ? { ...x, reminded: true } : x)),
              notifications: [note, ...s.notifications],
              banner: note,
            };
          }),
        unlock: () => set({ locked: false }),
        lock: () => set({ locked: true, app: null, banner: null }),
        goHome: () => set({ app: null, decision: null }),
        openApp: (app, params) =>
          set((s) => ({
            app,
            locked: false,
            banner: null,
            page: s.page,
            offshiftScreen: app === "offshift" ? params?.screen || (s.app === "offshift" ? s.offshiftScreen : "week") : s.offshiftScreen,
            offerId: params?.offerId ?? (app === "offshift" ? s.offerId : s.offerId),
            decision: app === "offshift" ? s.decision : null,
          })),
        setPage: (page) => set({ page: Math.max(0, Math.min(1, page)) }),
        setOffshiftScreen: (screen, offerId) => set((s) => ({ offshiftScreen: screen, offerId: offerId === undefined ? s.offerId : offerId })),
        chooseDecision: (decision, extras) =>
          set((s) => {
            const offer = s.offers.find((o) => o.id === s.offerId);
            const alt = extras?.alt || (offer && decision === "negotiate" ? altSlots(offer, s)[0] : null);
            const colleague = extras?.colleague || (offer && decision === "swap" ? EMPLOYERS[offer.employer].colleagues[1] : null);
            return { decision, alt, colleague, offshiftScreen: "reply" };
          }),
        dismissBanner: () => set({ banner: null }),
        showToast: (text) => set((s) => ({ toast: text, toastKey: s.toastKey + 1 })),
        clearToast: () => set({ toast: null }),

        sendOffer: (employer, input) =>
          set((s) => {
            const emp = EMPLOYERS[employer];
            const at = stamp(s);
            const id = uid("o");
            const offer: Offer = { id, employer, day: input.day, start: input.start, end: input.end, note: input.note, from: emp.manager.name, sentAt: at, status: "pending" };
            const draftState = { ...s, offers: [...s.offers, offer] };
            const firstFlag = offerChecks(offer, draftState).find((c) => c.state !== "ok");
            const dayWord = offer.day === SCENARIO.today ? "tonight" : DAY_NAMES[offer.day];
            const workerNote: Notification = { id: uid("n"), app: employer, title: emp.workerApp, body: `${emp.manager.name}: ${input.note}`, at, offerId: id };
            const offshiftNote: Notification = {
              id: uid("n"),
              app: "offshift",
              title: "Offshift",
              body: `${emp.manager.name} is asking about ${dayWord}, ${range12(offer.start, offer.end)}. ${firstFlag ? firstFlag.text.split(". ")[0] + "." : "Nothing in the way so far."} Think it through when you're ready.`,
              at,
              offerId: id,
            };
            return {
              clock: at,
              offers: [...s.offers, offer],
              messages: [...s.messages, { id: uid("m"), employer, from: "manager", text: input.note, at, offerId: id }],
              notifications: [offshiftNote, workerNote, ...s.notifications],
              sync: log(s, at, emp.managerApp, `${emp.workerApp} · Offshift`, `Shift offer from ${emp.manager.name}: ${offer.day} ${range24(offer.start, offer.end)}.`),
              banner: workerNote,
              toast: `Sent to Dinda.`,
              toastKey: s.toastKey + 1,
            };
          }),

        publishShift: (employer, input) =>
          set((s) => {
            const emp = EMPLOYERS[employer];
            const at = stamp(s);
            const shift: Shift = { id: uid("s"), employer, day: input.day, start: input.start, end: input.end, note: input.note };
            const note: Notification = { id: uid("n"), app: employer, title: emp.workerApp, body: `Roster updated: ${DAY_NAMES[input.day]} ${range12(input.start, input.end)} added.`, at };
            return {
              clock: at,
              shifts: [...s.shifts, shift],
              notifications: [note, ...s.notifications],
              messages: [...s.messages, { id: uid("m"), employer, from: "system", text: `Roster updated: ${DAY_NAMES[input.day]} ${range24(input.start, input.end)}.`, at }],
              sync: [
                ...log(s, at, emp.managerApp, `${emp.workerApp} · Offshift`, `Roster change: ${input.day} ${range24(input.start, input.end)} added.`),
                { id: uid("y"), at, from: "Offshift", to: "Calendar", text: `${input.day} ${range24(input.start, input.end)} added with travel time around it.` },
              ],
              banner: note,
              toast: "Roster published.",
              toastKey: s.toastKey + 1,
            };
          }),

        respondToOffer: (offerId, decision, text, extras) =>
          set((s) => {
            const offer = s.offers.find((o) => o.id === offerId);
            if (!offer) return {};
            const emp = EMPLOYERS[offer.employer];
            const at = stamp(s);
            const patch: Partial<Store> = { clock: at, decision: null, offshiftScreen: "week", offerId: null };
            let next: Offer = { ...offer, repliedAt: at };
            let messages = s.messages;
            let sync = s.sync;
            let shifts = s.shifts;
            let toast = "";
            const reply = (t: string) => [...messages, { id: uid("m"), employer: offer.employer, from: "dinda" as const, text: t, at, offerId }];
            if (decision === "later") {
              const mins = extras?.reminderMinutes || 30;
              next = { ...next, status: "deferred", reminderAt: addMinutesToClock(s.clock, mins), reminderDue: Date.now() + Math.min(mins, 120) * 250, reminded: false };
              sync = log(s, at, "Offshift", "Only you", `Reminder set for ${next.reminderAt}. Nothing sent to ${emp.name}.`);
              toast = `Reminder set for ${next.reminderAt}.`;
            } else if (decision === "accept") {
              next = { ...next, status: "accepted" };
              shifts = [...shifts, { id: uid("s"), employer: offer.employer, day: offer.day, start: offer.start, end: offer.end, viaOffer: offerId }];
              messages = reply(text);
              sync = [
                ...log(s, at, "Offshift", emp.workerApp, `Reply sent as Dinda: accepted ${offer.day} ${range24(offer.start, offer.end)}.`),
                { id: uid("y"), at, from: emp.workerApp, to: "Offshift · Calendar", text: `${offer.day} ${range24(offer.start, offer.end)} booked, travel time added around it.` },
              ];
              toast = `Sent to ${emp.manager.name}. Shift added to your week.`;
            } else if (decision === "decline") {
              next = { ...next, status: "declined" };
              messages = reply(text);
              sync = log(s, at, "Offshift", emp.workerApp, `Reply sent as Dinda: declined ${offer.day} ${range24(offer.start, offer.end)}.`);
              toast = `Sent to ${emp.manager.name}. ${DAY_NAMES[offer.day]} stays yours.`;
            } else if (decision === "negotiate") {
              const alt = extras?.alt || altSlots(offer, s)[0];
              next = { ...next, status: "countered", alt };
              messages = reply(text);
              sync = log(s, at, "Offshift", emp.workerApp, `Reply sent as Dinda: offered ${alt.label} instead.`);
              toast = `Sent to ${emp.manager.name}: ${alt.label}.`;
            } else if (decision === "swap") {
              const who = extras?.colleague || emp.colleagues[1];
              next = { ...next, status: "swap-requested", colleague: who };
              messages = reply(text);
              sync = log(s, at, "Offshift", emp.workerApp, `Reply sent as Dinda: swap with ${who} requested.`);
              toast = `Sent to ${emp.manager.name}. Waiting on a reply.`;
            }
            return {
              ...patch,
              offers: s.offers.map((o) => (o.id === offerId ? next : o)),
              messages,
              sync,
              shifts,
              notifications: s.notifications.filter((n) => n.offerId !== offerId || decision === "later"),
              toast,
              toastKey: s.toastKey + 1,
            };
          }),

        managerResolve: (offerId, action) =>
          set((s) => {
            const offer = s.offers.find((o) => o.id === offerId);
            if (!offer) return {};
            const emp = EMPLOYERS[offer.employer];
            const at = stamp(s, 2);
            if (action === "confirm-alt" && offer.alt) {
              const alt = offer.alt;
              const shifts = alt.nextWeek ? s.shifts : [...s.shifts, { id: uid("s"), employer: offer.employer, day: alt.day, start: alt.start, end: alt.end, viaOffer: offerId }];
              const text = `Great, ${alt.label} works. Thanks Dinda!`;
              const note: Notification = { id: uid("n"), app: offer.employer, title: emp.workerApp, body: `${emp.manager.name}: ${text}`, at, offerId };
              return {
                clock: at,
                shifts,
                offers: s.offers.map((o) => (o.id === offerId ? { ...o, status: "alt-confirmed" as const } : o)),
                messages: [...s.messages, { id: uid("m"), employer: offer.employer, from: "manager", text, at, offerId }],
                notifications: [note, ...s.notifications],
                sync: [
                  ...log(s, at, emp.managerApp, `${emp.workerApp} · Offshift`, `${alt.label} confirmed${alt.nextWeek ? " for next week" : ""}.`),
                  ...(alt.nextWeek ? [] : [{ id: uid("y"), at, from: "Offshift", to: "Calendar", text: `${alt.day} ${range24(alt.start, alt.end)} added with travel time around it.` }]),
                ],
                banner: note,
                toast: `Confirmed ${alt.label}.`,
                toastKey: s.toastKey + 1,
              };
            }
            if (action === "approve-swap") {
              const who = offer.colleague || emp.colleagues[1];
              const text = `Sorted, ${who}'s got it. Thanks for sorting it out.`;
              const note: Notification = { id: uid("n"), app: offer.employer, title: emp.workerApp, body: `${emp.manager.name}: ${text}`, at, offerId };
              return {
                clock: at,
                offers: s.offers.map((o) => (o.id === offerId ? { ...o, status: "swapped" as const } : o)),
                messages: [...s.messages, { id: uid("m"), employer: offer.employer, from: "manager", text, at, offerId }],
                notifications: [note, ...s.notifications],
                sync: log(s, at, emp.managerApp, `${emp.workerApp} · Offshift`, `Shift ${offer.day} ${range24(offer.start, offer.end)} reassigned to ${who}.`),
                banner: note,
                toast: `Swap approved.`,
                toastKey: s.toastKey + 1,
              };
            }
            return {};
          }),

        sendMessage: (employer, from, text) =>
          set((s) => {
            const at = stamp(s);
            const emp = EMPLOYERS[employer];
            const note: Notification | null = from === "manager" ? { id: uid("n"), app: employer, title: emp.workerApp, body: `${emp.manager.name}: ${text}`, at } : null;
            return {
              clock: at,
              messages: [...s.messages, { id: uid("m"), employer, from, text, at }],
              notifications: note ? [note, ...s.notifications] : s.notifications,
              banner: note,
            };
          }),

        rateShift: (shiftId, body, kit) =>
          set((s) => {
            const at = stamp(s);
            return {
              clock: at,
              shifts: s.shifts.map((sh) => (sh.id === shiftId ? { ...sh, rated: body } : sh)),
              checkins: [...s.checkins, { id: uid("c"), shiftId, body, kit, at }],
              sync: log(s, at, "Offshift", "Only you", `Check-in saved: ${body}. Nothing shared with any employer.`),
            };
          }),

        addPersonal: (event) => {
          const id = uid("p");
          set((s) => {
            const at = stamp(s);
            const ev: PersonalEvent = { id, ...event };
            return {
              clock: at,
              personal: [...s.personal, ev],
              sync: log(s, at, "Calendar", "Offshift", `${ev.day} ${range24(ev.start, ev.end)} “${ev.title}” added to the week.`),
              toast: `Added ${ev.title}.`,
              toastKey: s.toastKey + 1,
            };
          });
          return id;
        },
        updatePersonal: (id, patch) =>
          set((s) => {
            const p = s.personal.find((x) => x.id === id);
            if (!p) return {};
            const at = stamp(s);
            const next = { ...p, ...patch };
            return {
              clock: at,
              personal: s.personal.map((x) => (x.id === id ? next : x)),
              sync: log(s, at, "Calendar", "Offshift", `“${next.title}” now ${next.day} ${range24(next.start, next.end)}.`),
            };
          }),
        notePrivate: (text) =>
          set((s) => {
            const at = stamp(s);
            return { clock: at, sync: log(s, at, "Offshift", "Only you", text) };
          }),
        setProtected: (id, on) =>
          set((s) => {
            const cur = s.settings.protectedIds || [];
            if (on === cur.includes(id)) return {};
            const at = stamp(s);
            return {
              clock: at,
              settings: { ...s.settings, protectedIds: on ? [...cur, id] : cur.filter((x) => x !== id) },
              sync: log(s, at, "Offshift", "Only you", on ? "Time protected by you." : "Protection removed."),
            };
          }),
        removePersonal: (id) =>
          set((s) => {
            const p = s.personal.find((x) => x.id === id);
            if (!p) return {};
            const at = stamp(s);
            return { clock: at, personal: s.personal.filter((x) => x.id !== id), sync: log(s, at, "Calendar", "Offshift", `“${p.title}” removed from ${DAY_NAMES[p.day]}.`) };
          }),
        movePersonal: (id, day) =>
          set((s) => {
            const p = s.personal.find((x) => x.id === id);
            if (!p || p.day === day) return {};
            const at = stamp(s);
            return { clock: at, personal: s.personal.map((x) => (x.id === id ? { ...x, day } : x)), sync: log(s, at, "Calendar", "Offshift", `“${p.title}” moved to ${DAY_NAMES[day]}.`) };
          }),
        removeShift: (id) =>
          set((s) => {
            const sh = s.shifts.find((x) => x.id === id);
            if (!sh) return {};
            const at = stamp(s);
            const emp = EMPLOYERS[sh.employer];
            return {
              clock: at,
              shifts: s.shifts.filter((x) => x.id !== id),
              sync: log(s, at, "Offshift", `${emp.workerApp} · Calendar`, `${DAY_NAMES[sh.day]} ${range24(sh.start, sh.end)} dropped from the week.`),
            };
          }),
        removeUni: (id) =>
          set((s) => {
            const u = s.uni.find((x) => x.id === id);
            if (!u) return {};
            const at = stamp(s);
            return { clock: at, uni: s.uni.filter((x) => x.id !== id), sync: log(s, at, "Offshift", "Calendar", `${u.course} ${u.title.toLowerCase()} dropped from ${DAY_NAMES[u.day]}.`) };
          }),
        restore: (kind, item) =>
          set((s) => {
            if (kind === "shift") return s.shifts.some((x) => x.id === item.id) ? {} : { shifts: [...s.shifts, item as Shift] };
            if (kind === "uni") return s.uni.some((x) => x.id === item.id) ? {} : { uni: [...s.uni, item as UniEvent] };
            return s.personal.some((x) => x.id === item.id) ? {} : { personal: [...s.personal, item as PersonalEvent] };
          }),
        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        dismissNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
        clearNotifications: () => set({ notifications: [] }),
        resetDemo: () => {
          set({ ...initialData(), ...initialUI });
          void get;
        },
      };
    },
    {
      name: "offshift-phone-v2",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as Partial<Store>,
      migrate: () => ({ ...initialData() }) as unknown as Store,
    },
  ),
);

/* ---------- selectors ---------- */

export const selectPendingOffers = (s: Store) => s.offers.filter((o) => o.status === "pending" || o.status === "deferred");
export const selectEmployerMessages = (employer: EmployerId) => (s: Store) => s.messages.filter((m) => m.employer === employer);
export const selectEmployerShifts = (employer: EmployerId) => (s: Store) => s.shifts.filter((m) => m.employer === employer);
export const selectUnread = (app: AppId) => (s: Store) => s.notifications.filter((n) => n.app === app).length;

export function currentDraftText(s: Store): string {
  const offer = s.offers.find((o) => o.id === s.offerId);
  if (!offer || !s.decision || s.decision === "later") return "";
  return draftFor(replyDraft(offer, s.decision, s, { alt: s.alt || undefined, colleague: s.colleague || undefined }), s.settings.tone);
}
