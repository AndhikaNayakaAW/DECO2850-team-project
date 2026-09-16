"use client";

import { useEffect, useState } from "react";
import { DATA_KEYS, pickData, useStore } from "./store";

const CLIENT = Math.random().toString(36).slice(2);
let version = -1;
let applying = false;

/** Rehydrates the persisted store once on the client. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    useStore.persist.rehydrate();
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

/** Keeps every device on the same scenario through /api/state. */
export default function SyncProvider() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function push() {
      const data = pickData(useStore.getState());
      try {
        const res = await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data, client: CLIENT }) });
        const j = (await res.json()) as { version: number };
        if (typeof j.version === "number") version = j.version;
        setOnline(true);
      } catch {
        setOnline(false);
      }
    }

    const unsub = useStore.subscribe((s, prev) => {
      if (applying) return;
      if (DATA_KEYS.every((k) => s[k] === prev[k])) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(push, 150);
    });

    async function pull(initial: boolean) {
      try {
        const res = await fetch(`/api/state?since=${version}`, { cache: "no-store" });
        const j = (await res.json()) as { version: number; client: string | null; data?: Record<string, unknown> | null };
        setOnline(true);
        if (j.version > version) {
          if (j.data && j.client !== CLIENT) {
            applying = true;
            useStore.setState(j.data);
            applying = false;
          }
          version = j.version;
        }
        if (initial && !j.data) await push();
      } catch {
        setOnline(false);
      }
    }

    (async () => {
      await pull(true);
      while (!stopped) {
        await new Promise((r) => setTimeout(r, 1000));
        if (!stopped) await pull(false);
      }
    })();

    return () => {
      stopped = true;
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return online === false ? <div className="sync-off" role="status">offline</div> : null;
}
