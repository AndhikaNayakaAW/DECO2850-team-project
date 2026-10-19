import { seedData } from "@/lib/scenario";
import { loadState, saveState, type Saved } from "@/lib/server-state";
import type { DataSlice, Decision } from "@/lib/types";
import { WATCH_DECISIONS, applyWatchAnswer, applyWatchBody, applyWatchHealth, parseHealth, stopWatchHealth, watchSummary } from "@/lib/garmin";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

function current(s: Saved): DataSlice {
  return (s.data as DataSlice | null) ?? seedData();
}

/** What the watch shows: the waiting ask with its Week lines, or the last reply. */
export async function GET() {
  const s = await loadState();
  return Response.json({ v: s.version, ...watchSummary(current(s)) }, { headers });
}

/** An answer from the wrist, a health reading as levels from 0 to 3, or sharing turned off. */
export async function POST(req: Request) {
  const s = await loadState();
  let input: { answer?: { offerId?: unknown; decision?: unknown }; health?: unknown; body?: { level?: unknown } };
  try {
    input = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400, headers });
  }
  let data = current(s);
  let toast: string | undefined;
  if (input.answer) {
    const { offerId, decision } = input.answer;
    if (typeof offerId !== "string" || typeof decision !== "string" || !WATCH_DECISIONS.includes(decision as Decision)) {
      return Response.json({ error: "Unknown answer" }, { status: 400, headers });
    }
    const offer = data.offers.find((o) => o.id === offerId);
    if (!offer) return Response.json({ error: "No such ask" }, { status: 404, headers });
    const r = applyWatchAnswer(data, offerId, decision as Decision);
    if (!r) return Response.json({ error: "Already answered", v: s.version, ...watchSummary(data) }, { status: 409, headers });
    data = r.data;
    toast = r.toast;
    saveState(s, data, "watch");
  } else if (input.health !== undefined) {
    const h = parseHealth(input.health);
    if (!h) return Response.json({ error: "No reading the calendar can use" }, { status: 400, headers });
    const next = "share" in h ? stopWatchHealth(data) : applyWatchHealth(data, h.signals, h.at);
    if (next !== data) {
      data = next;
      saveState(s, data, "watch");
    }
  } else if (input.body) {
    const next = applyWatchBody(data, Number(input.body.level));
    if (next !== data) {
      data = next;
      saveState(s, data, "watch");
    }
  } else {
    return Response.json({ error: "Send an answer or a health reading" }, { status: 400, headers });
  }
  return Response.json({ v: s.version, toast, ...watchSummary(data) }, { headers });
}
