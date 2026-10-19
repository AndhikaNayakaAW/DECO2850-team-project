import { currentData, loadState, noWeek, noteWatchSeen, retrying, saveState } from "@/lib/server-state";
import { capLogs, cleanData } from "@/lib/validate";
import type { Decision } from "@/lib/types";
import { WATCH_DECISIONS, applyWatchAnswer, applyWatchBody, applyWatchHealth, parseHealth, stopWatchHealth, watchSummary } from "@/lib/garmin";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

/** What the watch shows: the waiting ask with its Week lines, or the last reply. */
export async function GET() {
  const s = await loadState();
  await noteWatchSeen();
  return Response.json({ v: s.version, ...watchSummary(currentData(s)) }, { headers });
}

/** An answer from the wrist, a health reading as levels from 0 to 3, or sharing turned off. */
export async function POST(req: Request) {
  let input: { answer?: { offerId?: unknown; decision?: unknown }; health?: unknown; body?: { level?: unknown } };
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

  let change: ((data: ReturnType<typeof currentData>) => ReturnType<typeof currentData>) | null = null;
  if (input.health !== undefined) {
    const h = parseHealth(input.health);
    if (!h) return Response.json({ error: "No reading the calendar can use" }, { status: 400, headers });
    change = "share" in h ? (data) => stopWatchHealth(data) : (data) => applyWatchHealth(data, h.signals, h.at);
  } else if (input.body) {
    const level = Number(input.body.level);
    change = (data) => applyWatchBody(data, level);
  }
  if (!change) return Response.json({ error: "Send an answer or a health reading" }, { status: 400, headers });
  const apply = change;
  return retrying(async () => {
    const s = await loadState();
    // Never start or replace a week from the wrist: that's for the calendar or a new session.
    if (noWeek(s)) return Response.json({ error: "No session yet. Open the calendar or start a new session on the team page." }, { status: 409, headers });
    const data = currentData(s);
    const next = apply(data);
    if (next !== data && !cleanData(capLogs(next))) return Response.json({ error: "That would break the week" }, { status: 400, headers });
    if (next !== data) await saveState(s, next, "watch");
    return Response.json({ v: s.version, ...watchSummary(next) }, { headers });
  });
}
