import { currentData, loadState, noWeek, noteWatchSeen, retrying, saveState } from "@/lib/server-state";
import { capLogs, cleanData } from "@/lib/validate";
import type { Decision } from "@/lib/types";
import { applyEffort, isEffort } from "@/lib/effort";
import { WATCH_DECISIONS, applyWatchAnswer, watchSummary } from "@/lib/garmin";
import { applyShiftBody, forgetShiftBodies, parseShiftBody } from "@/lib/shift-body";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

/** What the watch shows: the waiting ask with its Week lines, or the last reply. */
export async function GET() {
  const s = await loadState();
  await noteWatchSeen();
  return Response.json({ v: s.version, ...watchSummary(currentData(s)) }, { headers });
}

/** An answer from the wrist, how the work was, a shift's heart rate and stress as levels from 0 to 3, or sharing turned off. */
export async function POST(req: Request) {
  let input: { answer?: { offerId?: unknown; decision?: unknown }; effort?: { shiftId?: unknown; level?: unknown }; shiftBody?: unknown; health?: unknown; body?: unknown };
  try {
    input = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400, headers });
  }
  if (!input || typeof input !== "object") return Response.json({ error: "Send an answer or a health reading" }, { status: 400, headers });
  await noteWatchSeen();

  if (input.answer) {
    const { offerId, decision } = input.answer;
    if (typeof offerId !== "string" || typeof decision !== "string" || !WATCH_DECISIONS.includes(decision as Decision)) {
      return Response.json({ error: "Unknown answer" }, { status: 400, headers });
    }
    return retrying(async () => {
      const s = await loadState();
      const data = currentData(s);
      if (!data.offers.some((o) => o.id === offerId)) return Response.json({ error: "No such ask" }, { status: 404, headers });
      const r = applyWatchAnswer(data, offerId, decision as Decision);
      if (!r) return Response.json({ error: "Already answered", v: s.version, ...watchSummary(data) }, { status: 409, headers });
      if (!cleanData(capLogs(r.data))) return Response.json({ error: "That would break the week" }, { status: 400, headers });
      await saveState(s, r.data, "watch");
      return Response.json({ v: s.version, toast: r.toast, ...watchSummary(r.data) }, { headers });
    });
  }

  // How the work was on a finished shift: one of four words, or a skip. It stays with the worker.
  if (input.effort) {
    const { shiftId, level } = input.effort;
    if (typeof shiftId !== "string" || !(isEffort(level) || level === "skip")) return Response.json({ error: "Unknown rating" }, { status: 400, headers });
    return retrying(async () => {
      const s = await loadState();
      const data = currentData(s);
      if (!data.shifts.some((x) => x.id === shiftId)) return Response.json({ error: "No such shift" }, { status: 404, headers });
      const r = applyEffort(data, shiftId, level);
      if (!r) return Response.json({ error: "That shift hasn't finished" }, { status: 409, headers });
      if (!cleanData(capLogs(r.data))) return Response.json({ error: "That would break the week" }, { status: 400, headers });
      await saveState(s, r.data, "watch");
      return Response.json({ v: s.version, toast: r.toast, ...watchSummary(r.data) }, { headers });
    });
  }

  // Heart rate and stress during a shift that just finished, 15 minutes at a time. It stays with the worker.
  if (input.shiftBody !== undefined) {
    const body = parseShiftBody(input.shiftBody);
    if (!body) return Response.json({ error: "No reading the calendar can use" }, { status: 400, headers });
    return retrying(async () => {
      const s = await loadState();
      if (noWeek(s)) return Response.json({ error: "No session yet. Open the calendar first." }, { status: 409, headers });
      const data = currentData(s);
      const r = applyShiftBody(data, body);
      if ("problem" in r) {
        const [status, error]: [number, string] = r.problem === "missing" ? [404, "No such shift"] : r.problem === "unfinished" ? [409, "That shift hasn't finished"] : [400, "Those readings don't fit that shift"];
        return Response.json({ error }, { status, headers });
      }
      if (!cleanData(capLogs(r.data))) return Response.json({ error: "That would break the week" }, { status: 400, headers });
      await saveState(s, r.data, "watch");
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
    const s = await loadState();
    // Never start or replace a week from the wrist: that's for the calendar or a new session.
    if (noWeek(s)) return Response.json({ error: "No session yet. Open the calendar first." }, { status: 409, headers });
    const data = currentData(s);
    const next = apply(data);
    if (next !== data && !cleanData(capLogs(next))) return Response.json({ error: "That would break the week" }, { status: 400, headers });
    if (next !== data) await saveState(s, next, "watch");
    return Response.json({ v: s.version, ...watchSummary(next) }, { headers });
  });
}
