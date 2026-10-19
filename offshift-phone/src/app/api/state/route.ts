import { mergeData } from "@/lib/merge";
import { loadSnapshot, loadState, retrying, saveState, storageKind } from "@/lib/server-state";
import { emptyData } from "@/lib/session";
import { cleanData } from "@/lib/validate";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };
/** A week and its base are a few kilobytes each; anything far bigger isn't one. */
const MAX_BODY = 2 * 1024 * 1024;

/** The shared week for the calendar, with when the watch last checked in. */
export async function GET(req: Request) {
  const { saved: s, watchSeenAt } = await loadSnapshot();
  const params = new URL(req.url).searchParams;
  // Just which session is running, for pages that keep private data per session (the watch preview).
  if (params.has("session")) return Response.json({ version: s.version, session: cleanData(s.data)?.sessionStartedAt ?? null }, { headers });
  const since = Number(params.get("since") ?? -1);
  const meta = { watchSeenAt, storage: storageKind() };
  if (s.version === since) return Response.json({ version: s.version, client: s.client, ...meta }, { headers });
  return Response.json({ version: s.version, client: s.client, data: cleanData(s.data), ...meta }, { headers });
}

/**
 * A device's whole week. When something else reached the server after the device last synced
 * (an ask from the team, an answer from the watch), the two are merged instead of overwritten,
 * and the merged week is sent back. A device that has never synced can't overwrite a week it hasn't seen.
 */
export async function PUT(req: Request) {
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
    const s = await loadState();
    const server = cleanData(s.data);
    if (server && !base) {
      return Response.json({ error: "This device hasn't synced yet", version: s.version, data: server }, { status: 409, headers });
    }
    if (server && base && typeof baseVersion === "number" && baseVersion !== s.version) {
      const merged = mergeData(base, server, data);
      const version = await saveState(s, merged, client);
      return Response.json({ version, data: merged }, { headers });
    }
    const version = await saveState(s, data, client);
    return Response.json({ version }, { headers });
  });
}

/** Clears the shared week by starting an empty session, which every open device picks up. */
export async function DELETE() {
  return retrying(async () => {
    const version = await saveState(await loadState(), emptyData(), null);
    return Response.json({ version }, { headers });
  });
}
