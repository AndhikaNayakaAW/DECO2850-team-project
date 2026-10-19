import { loadState, saveState } from "@/lib/server-state";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const s = await loadState();
  const since = Number(new URL(req.url).searchParams.get("since") ?? -1);
  if (s.version <= since) return Response.json({ version: s.version, client: s.client }, { headers });
  return Response.json(s, { headers });
}

export async function PUT(req: Request) {
  const s = await loadState();
  const body = (await req.json()) as { data: unknown; client?: string };
  const version = saveState(s, body.data, body.client || null);
  return Response.json({ version }, { headers });
}

export async function DELETE() {
  const s = await loadState();
  const version = saveState(s, null, null);
  return Response.json({ version }, { headers });
}
