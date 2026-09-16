import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

interface Saved {
  version: number;
  client: string | null;
  data: unknown | null;
}

const FILE = process.env.OFFSHIFT_STATE_FILE || path.join(process.cwd(), ".offshift-state.json");
const g = globalThis as unknown as { __offshiftState?: Saved };

async function load(): Promise<Saved> {
  if (!g.__offshiftState) {
    try {
      g.__offshiftState = JSON.parse(await fs.readFile(FILE, "utf8")) as Saved;
    } catch {
      g.__offshiftState = { version: 0, client: null, data: null };
    }
  }
  return g.__offshiftState;
}

const headers = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const s = await load();
  const since = Number(new URL(req.url).searchParams.get("since") ?? -1);
  if (s.version <= since) return Response.json({ version: s.version, client: s.client }, { headers });
  return Response.json(s, { headers });
}

export async function PUT(req: Request) {
  const s = await load();
  const body = (await req.json()) as { data: unknown; client?: string };
  s.version += 1;
  s.client = body.client || null;
  s.data = body.data;
  fs.writeFile(FILE, JSON.stringify(s)).catch(() => {});
  return Response.json({ version: s.version }, { headers });
}

export async function DELETE() {
  const s = await load();
  s.version += 1;
  s.client = null;
  s.data = null;
  fs.writeFile(FILE, JSON.stringify(s)).catch(() => {});
  return Response.json({ version: s.version }, { headers });
}
