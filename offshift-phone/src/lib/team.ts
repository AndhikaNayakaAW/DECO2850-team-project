import { askProblem, resolveAsk, sendAsk, type AskInput } from "./actions";
import { workplacesOf } from "./checks";
import { emptyData, exampleWeek } from "./session";
import { nowIn } from "./time";
import type { DataSlice, OfferStatus } from "./types";

export interface TeamAsk {
  id: string;
  from: string;
  workplace: string;
  date: string;
  start: string;
  end: string;
  sentAt: string;
  status: OfferStatus;
  alt: string | null;
  thread: { id: string; from: "team" | "worker"; text: string; at: string }[];
}

/**
 * What the research team sees: the session, the asks with their replies, and messages the worker sent the team.
 * Never the worker's plans, body readings or private notes: those don't leave the server for this page.
 */
export interface TeamView {
  version: number;
  sessionStartedAt: string;
  name: string;
  timeZone: string;
  workplaces: string[];
  asks: TeamAsk[];
  notes: { id: string; text: string; at: string }[];
  log: { id: string; at: string; text: string }[];
  watchSeenAt: string | null;
}

export function teamView(data: DataSlice, version: number, watchSeenAt: string | null): TeamView {
  const asks = data.offers
    .slice()
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .map((o) => ({
      id: o.id,
      from: o.from,
      workplace: o.workplace,
      date: o.date,
      start: o.start,
      end: o.end,
      sentAt: o.sentAt,
      // The manager can't tell an ask the worker is deciding later from one they haven't seen.
      status: o.status === "deferred" ? "pending" : o.status,
      alt: o.alt?.label ?? null,
      thread: data.messages.filter((m) => m.offerId === o.id).map((m) => ({ id: m.id, from: m.from, text: m.text, at: m.at })),
    }));
  return {
    version,
    sessionStartedAt: data.sessionStartedAt,
    name: data.settings.name,
    timeZone: data.settings.timeZone,
    // Only where the team has asked before: the worker's other jobs are theirs.
    workplaces: workplacesOf({ shifts: [], offers: data.offers }),
    asks,
    notes: data.messages.filter((m) => m.from === "worker" && !m.offerId).map((m) => ({ id: m.id, text: m.text, at: m.at })),
    log: data.sync
      .filter((e) => e.to !== "Only you" && e.from !== "Watch")
      .slice(-12)
      .reverse()
      .map((e) => ({ id: e.id, at: e.at, text: e.text })),
    watchSeenAt,
  };
}

export type TeamAction =
  | { action: "send-ask"; ask: AskInput }
  | { action: "resolve"; offerId: string; how: "confirm-alt" | "approve-swap" }
  | { action: "new-session" }
  | { action: "practice-week" }
  | { action: "name"; name: string };

/** Applies something the team did to the shared week, or says what's wrong with it. */
export function applyTeamAction(data: DataSlice, input: unknown, at: Date = new Date()): { data: DataSlice } | { problem: string } {
  const a = (input ?? {}) as Partial<Record<string, unknown>>;
  switch (a.action) {
    case "send-ask": {
      const ask = (a.ask ?? {}) as AskInput;
      const problem = askProblem(ask, nowIn(data.settings.timeZone, at));
      return problem ? { problem } : { data: sendAsk(data, ask, at).data };
    }
    case "resolve": {
      if (typeof a.offerId !== "string" || (a.how !== "confirm-alt" && a.how !== "approve-swap")) return { problem: "Unknown ask." };
      const next = resolveAsk(data, a.offerId, a.how, at);
      return next === data ? { problem: "That ask has nothing to confirm." } : { data: next };
    }
    case "new-session":
      return { data: emptyData(at) };
    case "practice-week":
      return { data: exampleWeek(at) };
    case "name":
      if (typeof a.name !== "string" || a.name.trim().length > 30) return { problem: "Keep the name under 30 characters." };
      return { data: { ...data, settings: { ...data.settings, name: a.name.trim() } } };
    default:
      return { problem: "Unknown action." };
  }
}
