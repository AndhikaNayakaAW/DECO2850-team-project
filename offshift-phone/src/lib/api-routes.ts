/**
 * The API's handlers, one set per week ("live" for the participant, "demo" for the exhibition), so the demo routes
 * under /api/demo run exactly the same code on their own week. The route files only pick the space.
 */
import { applyEffort, isEffort } from "./effort";
import { WATCH_DECISIONS, applyWatchAnswer, watchSummary } from "./garmin";
import { mergeData } from "./merge";
import { currentData, loadSnapshot, loadState, noWeek, noteWatchSeen, retrying, saveState, storageKind, watchSeenAt } from "./server-state";
import { REFUSED, applyShiftBody, forgetShiftBodies, noteRefused, parseShiftBody } from "./shift-body";
import type { Space } from "./space";
import { applyTeamAction, teamView } from "./team";
import type { DataSlice, Decision } from "./types";
import { capLogs, cleanData } from "./validate";

const headers = { "Cache-Control": "no-store" };
/** A week and its base are a few kilobytes each; anything far bigger isn't one. */
const MAX_BODY = 2 * 1024 * 1024;

/** /api/state: the shared week for the calendar. `fresh` is what starting over gives. */
export function stateRoutes(space: Space, fresh: () => DataSlice) {
  return {
    /** The shared week for the calendar, with when the watch last checked in. */
    async GET(req: Request) {
      const { saved: s, watchSeenAt } = await loadSnapshot(space);
      const params = new URL(req.url).searchParams;
      // Just which session is running, for pages that keep private data per session (the watch preview).
      if (params.has("session")) return Response.json({ version: s.version, session: cleanData(s.data)?.sessionStartedAt ?? null }, { headers });
      const since = Number(params.get("since") ?? -1);
      const meta = { watchSeenAt, storage: storageKind() };
      if (s.version === since) return Response.json({ version: s.version, client: s.client, ...meta }, { headers });
      return Response.json({ version: s.version, client: s.client, data: cleanData(s.data), ...meta }, { headers });
    },

    /**
     * A device's whole week. When something else reached the server after the device last synced
     * (an ask from the team, an answer from the watch), the two are merged instead of overwritten,
     * and the merged week is sent back. A device that has never synced can't overwrite a week it hasn't seen.
     */
    async PUT(req: Request) {
      const raw = await req.text();
      if (raw.length > MAX_BODY) return Response.json({ error: "Too large" }, { status: 413, headers });
      let body: { data?: unknown; base?: unknown; baseVersion?: unknown; client?: unknown } | null;
      try {
        body = JSON.parse(raw);
      } catch {
        return Response.json({ error: "Expected JSON" }, { status: 400, headers });
      }
      const data = cleanData(body?.data);
      if (!body || !data) return Response.json({ error: "Expected a week in the current shape" }, { status: 400, headers });
      const base = cleanData(body.base);
      const baseVersion = body.baseVersion;
      if (base && typeof baseVersion !== "number") return Response.json({ error: "A base needs its version" }, { status: 400, headers });
      const client = typeof body.client === "string" ? body.client.slice(0, 40) : null;
      return retrying(async () => {
        const s = await loadState(space);
        const server = cleanData(s.data);
        if (server && !base) {
          return Response.json({ error: "This device hasn't synced yet", version: s.version, data: server }, { status: 409, headers });
        }
        if (server && base && typeof baseVersion === "number" && baseVersion !== s.version) {
          const merged = mergeData(base, server, data);
          const version = await saveState(s, merged, client, space);
          return Response.json({ version, data: merged }, { headers });
        }
        const version = await saveState(s, data, client, space);
        return Response.json({ version }, { headers });
      });
    },

    /** Starts the week over (an empty session, or the demo scenario), which every open device picks up. */
    async DELETE() {
      return retrying(async () => {
        const version = await saveState(await loadState(space), fresh(), null, space);
        return Response.json({ version }, { headers });
      });
    },
  };
}

/** /api/watch: what the watch shows, and what it sends back. */
export function watchRoutes(space: Space) {
  return {
    /** What the watch shows: the waiting ask with its Week lines, or the last reply. */
    async GET() {
      const s = await loadState(space);
      await noteWatchSeen(new Date(), space);
      return Response.json({ v: s.version, ...watchSummary(currentData(s)) }, { headers });
    },

    /** An answer from the wrist, how the work was, a shift's heart rate and stress as levels from 0 to 3, or sharing turned off. */
    async POST(req: Request) {
      let input: { answer?: { offerId?: unknown; decision?: unknown }; effort?: { shiftId?: unknown; level?: unknown }; shiftBody?: unknown; health?: unknown; body?: unknown };
      try {
        input = await req.json();
      } catch {
        return Response.json({ error: "Expected JSON" }, { status: 400, headers });
      }
      if (!input || typeof input !== "object") return Response.json({ error: "Send an answer or a health reading" }, { status: 400, headers });
      await noteWatchSeen(new Date(), space);

      if (input.answer) {
        const { offerId, decision } = input.answer;
        if (typeof offerId !== "string" || typeof decision !== "string" || !WATCH_DECISIONS.includes(decision as Decision)) {
          return Response.json({ error: "Unknown answer" }, { status: 400, headers });
        }
        return retrying(async () => {
          const s = await loadState(space);
          const data = currentData(s);
          if (!data.offers.some((o) => o.id === offerId)) return Response.json({ error: "No such ask" }, { status: 404, headers });
          const r = applyWatchAnswer(data, offerId, decision as Decision);
          if (!r) return Response.json({ error: "Already answered", v: s.version, ...watchSummary(data) }, { status: 409, headers });
          if (!cleanData(capLogs(r.data))) return Response.json({ error: "That would break the week" }, { status: 400, headers });
          await saveState(s, r.data, "watch", space);
          return Response.json({ v: s.version, toast: r.toast, ...watchSummary(r.data) }, { headers });
        });
      }

      // How the work was on a finished shift: one of four words, or a skip. It stays with the worker.
      if (input.effort) {
        const { shiftId, level } = input.effort;
        if (typeof shiftId !== "string" || !(isEffort(level) || level === "skip")) return Response.json({ error: "Unknown rating" }, { status: 400, headers });
        return retrying(async () => {
          const s = await loadState(space);
          const data = currentData(s);
          if (!data.shifts.some((x) => x.id === shiftId)) return Response.json({ error: "No such shift" }, { status: 404, headers });
          const r = applyEffort(data, shiftId, level);
          if (!r) return Response.json({ error: "That shift hasn't finished" }, { status: 409, headers });
          if (!cleanData(capLogs(r.data))) return Response.json({ error: "That would break the week" }, { status: 400, headers });
          await saveState(s, r.data, "watch", space);
          return Response.json({ v: s.version, toast: r.toast, ...watchSummary(r.data) }, { headers });
        });
      }

      // Heart rate and stress during a shift that just finished, 15 minutes at a time. It stays with the worker.
      if (input.shiftBody !== undefined) {
        const body = parseShiftBody(input.shiftBody);
        return retrying(async () => {
          const s = await loadState(space);
          if (noWeek(s)) return Response.json({ error: "No session yet. Open the calendar first." }, { status: 409, headers });
          const data = currentData(s);
          const r = body ? applyShiftBody(data, body) : ({ problem: "parse" } as const);
          if ("problem" in r) {
            // Say so in the worker's own log, so a reading that never arrives can be told from one never sent.
            const noted = noteRefused(data, r.problem);
            if (noted !== data && cleanData(capLogs(noted))) await saveState(s, noted, "watch", space);
            const status = r.problem === "missing" ? 404 : r.problem === "parse" || r.problem === "length" ? 400 : 409;
            return Response.json({ error: `Not stored: ${REFUSED[r.problem]}` }, { status, headers });
          }
          if (!cleanData(capLogs(r.data))) return Response.json({ error: "That would break the week" }, { status: 400, headers });
          await saveState(s, r.data, "watch", space);
          return Response.json({ v: s.version, ...watchSummary(r.data) }, { headers });
        });
      }

      // Older watch builds still send an all-day reading every few minutes. Offshift only reads shifts now, so it is
      // answered and not kept. Sharing turned off, from any build, forgets every shift's readings.
      const health = input.health ?? (input.body !== undefined ? {} : undefined);
      if (health === undefined) return Response.json({ error: "Send an answer or a reading" }, { status: 400, headers });
      const stop = !!health && typeof health === "object" && (health as { share?: unknown }).share === false;
      const apply = (data: ReturnType<typeof currentData>) => (stop ? forgetShiftBodies(data) : data);
      return retrying(async () => {
        const s = await loadState(space);
        // Never start or replace a week from the wrist: that's for the calendar or a new session.
        if (noWeek(s)) return Response.json({ error: "No session yet. Open the calendar first." }, { status: 409, headers });
        const data = currentData(s);
        const next = apply(data);
        if (next !== data && !cleanData(capLogs(next))) return Response.json({ error: "That would break the week" }, { status: 400, headers });
        if (next !== data) await saveState(s, next, "watch", space);
        return Response.json({ v: s.version, ...watchSummary(next) }, { headers });
      });
    },
  };
}

/** /api/team: the research team's view and actions, including the calendar's Test offer. */
export function teamRoutes(space: Space) {
  return {
    /** The research team's view of the session: asks and replies, never the worker's plans or body. */
    async GET(req: Request) {
      const { saved: s, watchSeenAt } = await loadSnapshot(space);
      const since = Number(new URL(req.url).searchParams.get("since") ?? -1);
      if (s.version === since) return Response.json({ version: s.version, watchSeenAt }, { headers });
      return Response.json(teamView(currentData(s), s.version, watchSeenAt), { headers });
    },

    /** Something the team did: send an ask, confirm another time or a swap, start a session, set the name. */
    async POST(req: Request) {
      let input: unknown;
      try {
        input = await req.json();
      } catch {
        return Response.json({ error: "Expected JSON" }, { status: 400, headers });
      }
      return retrying(async () => {
        const s = await loadState(space);
        const replaces = (input as { action?: unknown } | null)?.action === "new-session" || (input as { action?: unknown } | null)?.action === "practice-week";
        // Only a new session (or the practice week) starts or replaces a week; anything else needs one to build on.
        if (!replaces && noWeek(s)) return Response.json({ error: "No session yet. Press New session to start one." }, { status: 409, headers });
        const r = applyTeamAction(currentData(s), input);
        if ("problem" in r) return Response.json({ error: r.problem }, { status: 400, headers });
        if (!cleanData(capLogs(r.data))) return Response.json({ error: "That would break the week." }, { status: 400, headers });
        await saveState(s, r.data, "team", space);
        return Response.json(teamView(r.data, s.version, await watchSeenAt(space)), { headers });
      });
    },
  };
}
