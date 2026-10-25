import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { applyResponse, sendAsk, unanswer, type AskInput } from "./actions";
import { uid } from "./ids";
import { emptyData, exampleWeek } from "./session";
import type { DataSlice, Decision, Effort, PersonalEvent, Settings, Shift, UniEvent } from "./types";
import { LOG_LIMIT, MESSAGE_LIMIT, cleanData } from "./validate";

export type { DataSlice } from "./types";

export interface UISlice {
  toast: string | null;
  toastKey: number;
  /** How long the toast stays. */
  toastMs: number;
}

type Patch<T> = Partial<Omit<T, "id">>;

export interface Actions {
  addShift: (input: Omit<Shift, "id">) => string;
  updateShift: (id: string, patch: Patch<Shift>) => void;
  removeShift: (id: string) => void;
  addUni: (input: Omit<UniEvent, "id">) => string;
  updateUni: (id: string, patch: Patch<UniEvent>) => void;
  removeUni: (id: string) => void;
  addPersonal: (input: Omit<PersonalEvent, "id">) => string;
  updatePersonal: (id: string, patch: Patch<PersonalEvent>) => void;
  removePersonal: (id: string) => void;
  restore: (kind: "shift" | "uni" | "personal", item: Shift | UniEvent | PersonalEvent) => void;
  setProtected: (id: string, on: boolean) => void;
  /** How the work was, set or changed on the calendar; null clears it. */
  setEffort: (id: string, effort: Effort | null) => void;
  /** Accept, decline or keep for later. Nothing is sent to the manager. */
  respondToOffer: (offerId: string, decision: Decision) => void;
  /** Undo for an answer: the ask waits again and its shift comes off the week. */
  unanswerOffer: (offerId: string) => void;
  sendAsk: (input: AskInput) => string;
  updateSettings: (patch: Partial<Settings>) => void;
  newSession: () => void;
  loadExample: () => void;
  showToast: (text: string) => void;
  clearToast: () => void;
}

export type Store = DataSlice & UISlice & Actions;

/** Real browser storage when it works; memory when it is blocked, missing, or a half-implemented shim. */
function safeStorage(): StateStorage {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (ls && typeof ls.getItem === "function" && typeof ls.setItem === "function" && typeof ls.removeItem === "function") return ls;
  } catch {}
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => {
      mem.set(k, v);
    },
    removeItem: (k) => {
      mem.delete(k);
    },
  };
}

export const DATA_KEYS: (keyof DataSlice)[] = ["schema", "sessionStartedAt", "shifts", "uni", "personal", "offers", "messages", "sync", "settings"];

export function pickData(s: DataSlice): DataSlice {
  return Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as DataSlice;
}

/**
 * The session a store has before any week is loaded, from this device's storage or from the server.
 * It is never a real session: sync never sends a week that still carries it.
 */
export const UNLOADED = new Date(0).toISOString();


export const useStore = create<Store>()(
  persist(
    (rawSet, get) => {
      const toast = (s: Store, text: string, ms = 4500) => ({ toast: text, toastKey: s.toastKey + 1, toastMs: ms });
      /**
       * Every change goes through here: one that would leave the week malformed (an over-long name, a cleared time)
       * is refused with a toast, so the store never holds a week the server would reject and sync never stalls.
       */
      const set = (partial: Partial<Store> | ((s: Store) => Partial<Store>)) =>
        rawSet((s) => {
          const next = typeof partial === "function" ? partial(s) : partial;
          if (!next || !DATA_KEYS.some((k) => k in next)) return next;
          const merged = { ...s, ...next } as Store;
          const trimmed = {
            sync: merged.sync.length > LOG_LIMIT ? merged.sync.slice(-LOG_LIMIT) : merged.sync,
            messages: merged.messages.length > MESSAGE_LIMIT ? merged.messages.slice(-MESSAGE_LIMIT) : merged.messages,
          };
          if (!cleanData({ ...pickData(merged), ...trimmed })) return toast(s, "That couldn't be saved. Check the date and times, and keep names short.");
          return trimmed.sync === merged.sync && trimmed.messages === merged.messages ? next : { ...next, ...trimmed };
        });
      return {
        ...emptyData(new Date(0)),
        toast: null,
        toastKey: 0,
        toastMs: 4500,

        addShift: (input) => {
          const id = uid("s");
          set((s) => ({ shifts: [...s.shifts, { ...input, workplace: input.workplace.trim(), id }] }));
          return id;
        },
        // The watch read a shift's own hours: if the worker changes when it ran, those readings no longer fit it.
        updateShift: (id, patch) =>
          set((s) => ({
            shifts: s.shifts.map((x) => {
              if (x.id !== id) return x;
              const next = { ...x, ...patch };
              return next.date !== x.date || next.start !== x.start || next.end !== x.end ? { ...next, body: undefined } : next;
            }),
          })),
        removeShift: (id) => set((s) => ({ shifts: s.shifts.filter((x) => x.id !== id) })),
        addUni: (input) => {
          const id = uid("u");
          set((s) => ({ uni: [...s.uni, { ...input, id }] }));
          return id;
        },
        updateUni: (id, patch) => set((s) => ({ uni: s.uni.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
        removeUni: (id) => set((s) => ({ uni: s.uni.filter((x) => x.id !== id) })),
        addPersonal: (input) => {
          const id = uid("p");
          set((s) => ({ personal: [...s.personal, { category: "personal", importance: "flexible", ...input, id }] }));
          return id;
        },
        updatePersonal: (id, patch) => set((s) => ({ personal: s.personal.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
        removePersonal: (id) => set((s) => ({ personal: s.personal.filter((x) => x.id !== id) })),
        restore: (kind, item) =>
          set((s) => {
            if (kind === "shift" && !s.shifts.some((x) => x.id === item.id)) return { shifts: [...s.shifts, item as Shift] };
            if (kind === "uni" && !s.uni.some((x) => x.id === item.id)) return { uni: [...s.uni, item as UniEvent] };
            if (kind === "personal" && !s.personal.some((x) => x.id === item.id)) return { personal: [...s.personal, item as PersonalEvent] };
            return {};
          }),
        setProtected: (id, on) =>
          set((s) => {
            const ids = new Set(s.settings.protectedIds);
            if (on) ids.add(id);
            else ids.delete(id);
            return { settings: { ...s.settings, protectedIds: [...ids] }, personal: on ? s.personal : s.personal.map((p) => (p.id === id && p.importance === "protected" ? { ...p, importance: "important" } : p)) };
          }),
        setEffort: (id, effort) =>
          set((s) => ({ shifts: s.shifts.map((x) => (x.id === id && x.effort !== (effort ?? undefined) ? { ...x, effort: effort ?? undefined, effortSkipped: effort ? undefined : x.effortSkipped } : x)) })),
        respondToOffer: (offerId, decision) =>
          set((s) => {
            const r = applyResponse(pickData(s), offerId, decision);
            return r ? { ...r.data, ...toast(s, r.toast) } : {};
          }),
        unanswerOffer: (offerId) => set((s) => ({ ...unanswer(pickData(s), offerId) })),
        sendAsk: (input) => {
          const r = sendAsk(pickData(get()), input);
          set({ ...r.data });
          return r.id;
        },
        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        newSession: () => set((s) => ({ ...emptyData(), ...toast(s, "New session. The calendar is empty.") })),
        loadExample: () => set((s) => ({ ...exampleWeek(), ...toast(s, "Example week loaded.") })),
        showToast: (text) => set((s) => toast(s, text)),
        clearToast: () => set({ toast: null }),
      };
    },
    {
      name: "offshift-calendar-v2",
      storage: createJSONStorage(safeStorage),
      skipHydration: true,
      partialize: (s) => pickData(s),
      // Only a well-formed week in this version's shape is read back, and only its data: never anything else.
      merge: (persisted, current) => {
        const saved = cleanData(persisted);
        return saved ? { ...current, ...saved } : current;
      },
    },
  ),
);
