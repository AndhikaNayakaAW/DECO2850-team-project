import { promises as fs } from "node:fs";
import path from "node:path";

export interface Saved {
  version: number;
  client: string | null;
  data: unknown | null;
}

const g = globalThis as unknown as { __offshiftState?: Saved };

function file(): string {
  return process.env.OFFSHIFT_STATE_FILE || path.join(process.cwd(), ".offshift-state.json");
}

/** The shared scenario, held in memory and mirrored to a file so a restart keeps it. */
export async function loadState(): Promise<Saved> {
  if (!g.__offshiftState) {
    try {
      g.__offshiftState = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ file(), "utf8")) as Saved;
    } catch {
      g.__offshiftState = { version: 0, client: null, data: null };
    }
  }
  return g.__offshiftState;
}

/** Stores new data, bumps the version every device polls for, and returns that version. */
export function saveState(s: Saved, data: unknown | null, client: string | null): number {
  s.version += 1;
  s.client = client;
  s.data = data;
  fs.writeFile(/*turbopackIgnore: true*/ file(), JSON.stringify(s)).catch(() => {});
  return s.version;
}
