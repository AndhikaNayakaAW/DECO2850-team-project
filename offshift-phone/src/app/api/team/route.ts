import { currentData, loadSnapshot, loadState, noWeek, retrying, saveState, watchSeenAt } from "@/lib/server-state";
import { applyTeamAction, teamView } from "@/lib/team";
import { capLogs, cleanData } from "@/lib/validate";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

/** The research team's view of the session: asks and replies, never the worker's plans or body. */
export async function GET(req: Request) {
  const { saved: s, watchSeenAt } = await loadSnapshot();
  const since = Number(new URL(req.url).searchParams.get("since") ?? -1);
  if (s.version === since) return Response.json({ version: s.version, watchSeenAt }, { headers });
  return Response.json(teamView(currentData(s), s.version, watchSeenAt), { headers });
}

/** Something the team did: send an ask, confirm another time or a swap, start a session, set the name. */
export async function POST(req: Request) {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400, headers });
  }
  return retrying(async () => {
    const s = await loadState();
    const replaces = (input as { action?: unknown } | null)?.action === "new-session" || (input as { action?: unknown } | null)?.action === "practice-week";
    // Only a new session (or the practice week) starts or replaces a week; anything else needs one to build on.
    if (!replaces && noWeek(s)) return Response.json({ error: "No session yet. Press New session to start one." }, { status: 409, headers });
    const r = applyTeamAction(currentData(s), input);
    if ("problem" in r) return Response.json({ error: r.problem }, { status: 400, headers });
    if (!cleanData(capLogs(r.data))) return Response.json({ error: "That would break the week." }, { status: 400, headers });
    await saveState(s, r.data, "team");
    return Response.json(teamView(r.data, s.version, await watchSeenAt()), { headers });
  });
}
