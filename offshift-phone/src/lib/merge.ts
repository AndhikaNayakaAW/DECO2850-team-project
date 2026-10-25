import type { DataSlice, Offer, Settings } from "./types";

const LISTS = ["shifts", "uni", "personal", "offers", "messages", "sync"] as const;

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** One list, three ways: the server's order and items, minus what the device deleted, with what it changed and added. */
function mergeList<T extends { id: string }>(base: T[], server: T[], client: T[]): T[] {
  const inBase = new Map(base.map((x) => [x.id, x]));
  const inClient = new Map(client.map((x) => [x.id, x]));
  const out: T[] = [];
  const seen = new Set<string>();
  for (const s of server) {
    seen.add(s.id);
    const b = inBase.get(s.id);
    const c = inClient.get(s.id);
    if (b && !c) continue;
    out.push(b && c && !same(c, b) ? c : s);
  }
  for (const c of client) if (!seen.has(c.id) && !inBase.has(c.id)) out.push(c);
  return out;
}

/** Each setting on its own, so the team naming the worker and the worker protecting a plan both survive. */
function mergeSettings(base: Settings, server: Settings, client: Settings): Settings {
  const out = { ...server } as Record<keyof Settings, unknown>;
  for (const key of Object.keys(client) as (keyof Settings)[]) {
    if (key === "protectedIds") continue;
    if (!same(client[key], base[key])) out[key] = client[key];
  }
  // Protected items as a set: added on either side stays added, removed on either side stays removed.
  const added = client.protectedIds.filter((id) => !base.protectedIds.includes(id));
  const removed = new Set(base.protectedIds.filter((id) => !client.protectedIds.includes(id)));
  out.protectedIds = [...new Set([...server.protectedIds.filter((id) => !removed.has(id)), ...added])];
  return out as unknown as Settings;
}

function open(o: Offer | undefined): boolean {
  return !!o && (o.status === "pending" || o.status === "deferred");
}

/**
 * Combines one device's edits (made on top of `base`) with whatever reached the server since,
 * so an ask from the team, an answer from the watch and an edit on the calendar never cancel each other out.
 * If an ask was answered in two places at once, the answer that reached the server first stands,
 * and the later one's reply and booked shift are dropped: the manager never hears two answers.
 */
export function mergeData(base: DataSlice, server: DataSlice, client: DataSlice): DataSlice {
  if (client.sessionStartedAt !== base.sessionStartedAt) return client;
  if (server.sessionStartedAt !== base.sessionStartedAt) return server;
  const out: DataSlice = { ...server };
  for (const key of LISTS) (out as unknown as Record<string, unknown>)[key] = mergeList<{ id: string }>(base[key], server[key], client[key]);
  out.settings = mergeSettings(base.settings, server.settings, client.settings);

  const baseOffers = new Map(base.offers.map((o) => [o.id, o]));
  const serverOffers = new Map(server.offers.map((o) => [o.id, o]));
  const twice = client.offers.filter((c) => {
    const b = baseOffers.get(c.id);
    const s = serverOffers.get(c.id);
    return open(b) && s && !open(s) && !same(c, b);
  });
  if (twice.length) {
    const ids = new Set(twice.map((o) => o.id));
    const known = new Set([...base.messages, ...server.messages].map((m) => m.id));
    const knownShifts = new Set([...base.shifts, ...server.shifts].map((s) => s.id));
    out.offers = out.offers.map((o) => (ids.has(o.id) ? serverOffers.get(o.id)! : o));
    out.messages = out.messages.filter((m) => !(m.offerId && ids.has(m.offerId) && !known.has(m.id)));
    out.shifts = out.shifts.filter((s) => !(s.viaOffer && ids.has(s.viaOffer) && !knownShifts.has(s.id)));
    const knownLog = new Set([...base.sync, ...server.sync].map((e) => e.id));
    out.sync = out.sync.filter((e) => !(e.offerId && ids.has(e.offerId) && !knownLog.has(e.id)));
  }
  return out;
}
