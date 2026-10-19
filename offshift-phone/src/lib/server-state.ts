import { promises as fs } from "node:fs";
import path from "node:path";
import { emptyData } from "./session";
import { LOG_LIMIT, MESSAGE_LIMIT, capLogs, cleanData } from "./validate";
import type { DataSlice } from "./types";

export interface Saved {
  version: number;
  client: string | null;
  data: unknown | null;
}

const KEY = "offshift:state";
const SEEN_KEY = "offshift:watch-seen";
const g = globalThis as unknown as { __offshiftState?: Saved; __offshiftWatchSeen?: string; __offshiftLoading?: Promise<Saved> };
let writing: Promise<void> = Promise.resolve();

/** Thrown when another server instance saved the week after this one read it. Read again and redo the change. */
export class StaleWrite extends Error {
  constructor() {
    super("The week changed while this change was being made");
  }
}

/**
 * Saves the week only if its version is still the one that was read, so two writes at the same moment
 * can't both claim the next version. The version is the first field of the stored JSON.
 */
const COMPARE_AND_SET = `local cur = redis.call('GET', KEYS[1])
local v = 0
if cur then v = tonumber(string.match(cur, '^{"version":(%d+)')) or 0 end
if v ~= tonumber(ARGV[1]) then return -1 end
redis.call('SET', KEYS[1], ARGV[2])
return v + 1`;

/**
 * Online storage when a Redis database is connected (Vercel's Upstash integration sets these),
 * so every server instance sees the same week. Without it, memory mirrored to a file on the laptop.
 */
function redisConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis(command: (string | number)[]): Promise<unknown> {
  const cfg = redisConfig()!;
  const res = await fetch(cfg.url, { method: "POST", headers: { Authorization: `Bearer ${cfg.token}`, "content-type": "application/json" }, body: JSON.stringify(command), cache: "no-store" });
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok || json.error) throw new Error(json.error || `Redis answered ${res.status}`);
  return json.result;
}

function parse(raw: unknown): Saved {
  if (typeof raw !== "string") return { version: 0, client: null, data: null };
  const s = JSON.parse(raw) as Saved;
  return { version: Number(s.version) || 0, client: s.client ?? null, data: s.data ?? null };
}

export function storageKind(): "redis" | "file" {
  return redisConfig() ? "redis" : "file";
}

function file(): string {
  return process.env.OFFSHIFT_STATE_FILE || path.join(process.cwd(), ".offshift-state.json");
}

/** The shared week, version and the client that last wrote it. */
export async function loadState(): Promise<Saved> {
  if (redisConfig()) return parse(await redis(["GET", KEY]));
  if (g.__offshiftState) return g.__offshiftState;
  // One read of the file, however many requests arrive at once, so they all share the same week.
  g.__offshiftLoading ??= fs.readFile(/*turbopackIgnore: true*/ file(), "utf8").then(
    (raw) => {
      try {
        return JSON.parse(raw) as Saved;
      } catch {
        // A file that won't parse isn't "no week": keep it unreadable, so only a device's week or New session replaces it.
        return { version: 0, client: null, data: { unreadable: raw.slice(0, 200) } };
      }
    },
    () => ({ version: 0, client: null, data: null }),
  );
  const loaded = await g.__offshiftLoading;
  g.__offshiftState ??= loaded;
  return g.__offshiftState;
}

/** The week and when the watch last checked in, in one round trip: what every open page polls for. */
export async function loadSnapshot(): Promise<{ saved: Saved; watchSeenAt: string | null }> {
  if (redisConfig()) {
    const [raw, seen] = (await redis(["MGET", KEY, SEEN_KEY])) as [unknown, unknown];
    return { saved: parse(raw), watchSeenAt: typeof seen === "string" ? seen : null };
  }
  return { saved: await loadState(), watchSeenAt: g.__offshiftWatchSeen ?? null };
}

/**
 * Stores new data, bumps the version every device polls for, and returns that version.
 * With Redis, throws StaleWrite if another instance saved after `s` was read.
 */
export async function saveState(s: Saved, data: unknown | null, client: string | null): Promise<number> {
  const week = cleanData(trimLogs(data));
  const next: Saved = { version: s.version + 1, client, data: week ? capLogs(week) : data };
  if (redisConfig()) {
    const result = Number(await redis(["EVAL", COMPARE_AND_SET, 1, KEY, s.version, JSON.stringify(next)]));
    if (result !== next.version) throw new StaleWrite();
  } else {
    // One write at a time, so the file always ends up holding the newest week.
    const json = JSON.stringify(next);
    // Written beside the real file and renamed into place, so a crash never leaves half a week.
    writing = writing
      .then(async () => {
        const tmp = `${file()}.tmp`;
        await fs.writeFile(/*turbopackIgnore: true*/ tmp, json);
        await fs.rename(/*turbopackIgnore: true*/ tmp, /*turbopackIgnore: true*/ file());
      })
      .catch(() => {});
  }
  Object.assign(s, next);
  return s.version;
}

/** The log and the conversation trimmed before checking, so a long session never reads as malformed. */
function trimLogs(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const d = data as { sync?: unknown; messages?: unknown };
  return {
    ...d,
    sync: Array.isArray(d.sync) ? d.sync.slice(-LOG_LIMIT) : d.sync,
    messages: Array.isArray(d.messages) ? d.messages.slice(-MESSAGE_LIMIT) : d.messages,
  };
}

/** Runs a read-change-save step again on the newer week when another instance saved in between, so neither change is lost. */
export async function retrying<T>(step: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await step();
    } catch (e) {
      if (!(e instanceof StaleWrite) || attempt >= 6) throw e;
    }
  }
}

/** The week in the current shape, or an empty one: an older or malformed saved week is never read as this one. */
export function currentData(s: Saved): DataSlice {
  return cleanData(s.data) ?? emptyData();
}

/** True when the server holds something it can't read as a week (as opposed to nothing at all). Only a new session may replace it. */
export function unreadable(s: Saved): boolean {
  return s.data !== null && s.data !== undefined && !cleanData(s.data);
}

/** No week to build on: nothing stored yet, or nothing readable. The calendar or New session starts one, never a side door. */
export function noWeek(s: Saved): boolean {
  return !cleanData(s.data);
}

/** Remembers when the watch last checked in, without bumping the week's version. */
export async function noteWatchSeen(at: Date = new Date()): Promise<void> {
  if (redisConfig()) await redis(["SET", SEEN_KEY, at.toISOString()]);
  else g.__offshiftWatchSeen = at.toISOString();
}

export async function watchSeenAt(): Promise<string | null> {
  if (redisConfig()) {
    const raw = await redis(["GET", SEEN_KEY]);
    return typeof raw === "string" ? raw : null;
  }
  return g.__offshiftWatchSeen ?? null;
}
