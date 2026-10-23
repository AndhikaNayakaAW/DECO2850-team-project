"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { mergeData } from "./merge";
import { STATUS } from "./status";
import { emptyData } from "./session";
import { DATA_KEYS, UNLOADED, pickData, useStore } from "./store";
import type { DataSlice } from "./types";
import { cleanData } from "./validate";
import { hidden, wait } from "./visible";

const CLIENT = Math.random().toString(36).slice(2);
/** Where this device keeps the last week it and the server agreed on, so a reload can merge edits made offline. */
const META_KEY = "offshift-sync-v2";
/** Reflections and imported heart rate from the removed watch preview: nothing can show or clear them any more. */
const REMOVED_PRIVATE_KEY = "offshift-private-watch-v1";

let version = -1;
let applying = false;
/** The last week this device and the server agreed on: the base for merging edits made here. */
let base: DataSlice | null = null;

let ready = false;
const readyListeners = new Set<() => void>();
let lastOnline = true;

/** Whether the last exchange with the server worked: a reply sent while offline goes later, and the worker is told. */
export function syncOnline(): boolean {
  return lastOnline;
}

function markReady() {
  if (ready) return;
  ready = true;
  for (const l of readyListeners) l();
}

/** True once the page has its week: the saved copy checked against the server, or the saved copy alone when offline. */
export function useSynced(): boolean {
  return useSyncExternalStore(
    (l) => {
      readyListeners.add(l);
      return () => readyListeners.delete(l);
    },
    () => ready,
    () => false,
  );
}

function apply(data: DataSlice) {
  applying = true;
  useStore.setState(pickData(data));
  applying = false;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const isOpen = (status: string | undefined) => status === "pending" || status === "deferred";

/** When an answer given here lost to one that reached the server first (the watch, another tab), say so. */
function noteOverridden(before: DataSlice | null, mine: DataSlice, merged: DataSlice) {
  for (const o of mine.offers) {
    // Only an ask that was waiting, and that this device answered.
    if (isOpen(o.status) || !isOpen(before?.offers.find((x) => x.id === o.id)?.status)) continue;
    const now = merged.offers.find((x) => x.id === o.id);
    if (now && now.status !== o.status) {
      useStore.getState().showToast(`${o.from}'s ask was already answered on another device (${STATUS[now.status]}), so your answer wasn't saved.`);
      return;
    }
  }
}

/** Edits made here that the server hasn't confirmed yet. */
function unsynced(): boolean {
  return base !== null && !same(pickData(useStore.getState()), base);
}

function loadMeta() {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) ?? "null") as { version?: unknown; base?: unknown } | null;
    const b = cleanData(m?.base);
    if (b && typeof m?.version === "number") {
      base = b;
      version = m.version;
    }
  } catch {}
}

function saveMeta() {
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ version, base }));
  } catch {}
}

/** The server's week becomes this device's, and the new base. */
function adopt(server: DataSlice, v: number) {
  apply(server);
  base = server;
  version = v;
  saveMeta();
}

/** Keeps the calendar and the watch on the same week through /api/state. */
export default function SyncProvider() {
  const [online, setOnlineState] = useState<boolean | null>(null);
  const [refused, setRefused] = useState(false);
  const setOnline = (v: boolean) => {
    lastOnline = v;
    setOnlineState(v);
  };
  useEffect(() => {
    let stopped = false;
    let started = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    let again = false;
    let interval = 1000;
    /** Counts answered pushes, so a poll that was already travelling can't roll back what a push just stored. */
    let pushes = 0;
    let unsub = () => {};

    /** The last week the server refused as malformed, so it isn't sent again and again. */
    let rejected: string | null = null;

    function schedule() {
      if (!started || stopped) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(push, 150);
    }

    async function push() {
      if (!started || stopped) return;
      // A store that never loaded a week holds only a placeholder: that is never anyone's week.
      if (useStore.getState().sessionStartedAt === UNLOADED) return;
      if (inFlight) {
        again = true;
        return;
      }
      inFlight = true;
      const sent = pickData(useStore.getState());
      const sentBase = base;
      // A save that never answers gives up, so polling and later saves carry on.
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 15000);
      try {
        const res = await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: sent, base, baseVersion: version, client: CLIENT }), signal: abort.signal });
        const j = (await res.json().catch(() => ({}))) as { version?: number; data?: unknown };
        if (res.status === 409) {
          // The server already holds a week this device never saw: take it rather than overwrite it.
          const server = cleanData(j.data);
          if (server && typeof j.version === "number") adopt(server, j.version);
        } else if (res.status === 400 || res.status === 413) {
          // Refused as malformed: say so, and don't send the same week again until it changes.
          rejected = JSON.stringify(sent);
          setRefused(true);
          return;
        } else if (!res.ok || typeof j.version !== "number") {
          // A page from a proxy or a login screen isn't a save.
          throw new Error(`state answered ${res.status}`);
        } else {
          setRefused(false);
          if (typeof j.version === "number") version = j.version;
          const merged = cleanData(j.data);
          if (merged) {
            // The server merged in changes from elsewhere. Keep any edits made here while this push was travelling.
            const local = pickData(useStore.getState());
            apply(same(local, sent) ? merged : mergeData(sent, merged, local));
            noteOverridden(sentBase, sent, merged);
            base = merged;
          } else base = sent;
          saveMeta();
        }
        pushes++;
        if (unsynced()) again = true;
        setOnline(true);
      } catch {
        // Kept here and sent again by the next poll once the connection is back.
        setOnline(false);
      } finally {
        clearTimeout(timeout);
        inFlight = false;
        if (again && !stopped) {
          again = false;
          schedule();
        }
      }
    }

    async function pull() {
      const pushesBefore = pushes;
      // A stalled connection gives up after a while, so the page opens with this device's copy instead of waiting.
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 8000);
      try {
        const res = await fetch(`/api/state?since=${version}`, { cache: "no-store", signal: abort.signal });
        if (!res.ok) throw new Error(`state answered ${res.status}`);
        const j = (await res.json()) as { version: number; data?: unknown };
        setOnline(true);
        interval = (j as { storage?: string }).storage === "redis" ? 2000 : 1000;
        if (stopped || inFlight || pushes !== pushesBefore) return;
        if (j.version === version || !("data" in j)) {
          // An edit that failed to send earlier goes again now (unless the server refused that very week),
          // and so does a first save that never reached an empty server.
          if (started && (unsynced() || base === null) && JSON.stringify(pickData(useStore.getState())) !== rejected) await push();
          return;
        }
        const server = cleanData(j.data);
        if (!server) {
          // Nothing usable on the server (a new deployment, or its storage was lost): this device's week becomes the shared one.
          version = j.version;
          base = null;
          saveMeta();
          if (useStore.getState().sessionStartedAt === UNLOADED) apply(emptyData());
          if (started) await push();
          return;
        }
        if (unsynced()) {
          // Edits here haven't reached the server yet: merge them in rather than overwrite them.
          const local = pickData(useStore.getState());
          const merged = mergeData(base!, server, local);
          apply(merged);
          noteOverridden(base, local, merged);
          base = server;
          version = j.version;
          saveMeta();
          if (unsynced()) schedule();
        } else adopt(server, j.version);
      } catch {
        setOnline(false);
      } finally {
        clearTimeout(timeout);
      }
    }

    try { localStorage.removeItem(REMOVED_PRIVATE_KEY); } catch {}
    (async () => {
      // The saved week first, before anything listens, so loading it is never mistaken for an edit.
      await useStore.persist.rehydrate();
      if (stopped) return;
      loadMeta();
      // The saved week couldn't be read (or there was none): start from the last week this device and the server agreed on.
      if (useStore.getState().sessionStartedAt === UNLOADED && base) apply(base);
      unsub = useStore.subscribe((s, prev) => {
        if (applying) return;
        if (DATA_KEYS.every((k) => s[k] === prev[k])) return;
        schedule();
      });
      await pull();
      // A device that has never had a week waits for the server: anything typed into the placeholder could never be saved.
      while (!stopped && useStore.getState().sessionStartedAt === UNLOADED) {
        await wait(2000);
        if (!stopped) await pull();
      }
      if (stopped) return;
      started = true;
      markReady();
      // Nothing on the server yet, or edits saved here while offline: send them now.
      if (unsynced() || base === null) await push();
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get("reset") === "1") {
          useStore.getState().newSession();
          params.delete("reset");
          window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`);
        }
      } catch {}
      while (!stopped) {
        await wait(interval);
        // A hidden page doesn't poll; it catches up the moment it is shown again.
        if (!stopped && !hidden()) await pull();
      }
    })();

    return () => {
      stopped = true;
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);
  if (refused)
    return (
      <div className="sync-off" role="status">
        A change couldn&apos;t be saved. Check the last thing you added.
      </div>
    );
  return online === false ? (
    <div className="sync-off" role="status">
      Offline. Changes stay on this device until the connection is back.
    </div>
  ) : null;
}
