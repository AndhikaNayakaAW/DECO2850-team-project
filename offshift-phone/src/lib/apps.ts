import type { AppId } from "./types";

export type IconId = AppId | "translink";

export interface AppDef {
  id: AppId;
  label: string;
}

export const APPS: Record<AppId, AppDef> = {
  offshift: { id: "offshift", label: "Offshift" },
  pandora: { id: "pandora", label: "Pandora Team" },
  mcd: { id: "mcd", label: "McDonald's Crew" },
  myuq: { id: "myuq", label: "myUQ" },
  calendar: { id: "calendar", label: "Calendar" },
  settings: { id: "settings", label: "Settings" },
  "pandora-manager": { id: "pandora-manager", label: "Pandora Manager" },
  "mcd-manager": { id: "mcd-manager", label: "McDonald's Manager" },
};

export const PAGE_ONE: AppId[] = ["offshift", "pandora", "mcd", "myuq", "settings"];
