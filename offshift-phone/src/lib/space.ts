/**
 * Which week a page or request works on: the participant's ("live") or the exhibition demo's ("demo").
 * The demo has its own storage, its own API under /api/demo and its own watch address, so nothing a visitor
 * does at the exhibition can reach a participant's week.
 */
export type Space = "live" | "demo";

/** The API a page in this space talks to. */
export function apiBase(space: Space): string {
  return space === "demo" ? "/api/demo" : "/api";
}

/** The space of a page, from its address: everything under /demo is the demo. */
export function spaceOfPath(pathname: string): Space {
  return pathname === "/demo" || pathname.startsWith("/demo/") ? "demo" : "live";
}

/** This browser page's space. On the server there is no page, so it is the live week. */
export function clientSpace(): Space {
  try {
    return typeof window === "undefined" ? "live" : spaceOfPath(window.location.pathname);
  } catch {
    return "live";
  }
}
