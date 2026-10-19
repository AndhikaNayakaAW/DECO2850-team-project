import { createHmac, timingSafeEqual } from "node:crypto";

/** The cookie a browser keeps once someone has entered the access code. */
export const ACCESS_COOKIE = "offshift_access";

/** How long a browser stays let in: long enough for a round of field tests. */
export const ACCESS_DAYS = 60;

/** The deployment's access code (OFFSHIFT_ACCESS_CODE). Without one, Offshift is open, as on a laptop. */
export function accessCode(): string | null {
  const code = process.env.OFFSHIFT_ACCESS_CODE?.trim();
  return code || null;
}

/** What the cookie holds: a keyed hash of the code, so the code itself never sits in a browser. */
export function accessToken(code: string): string {
  return createHmac("sha256", code).update("offshift-access").digest("hex");
}

function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Whether someone typed the code. Compared as hashes, so the time taken gives nothing away. */
export function codeMatches(input: unknown, code: string): boolean {
  return typeof input === "string" && sameText(accessToken(input.trim()), accessToken(code));
}

export function hasAccess(cookie: string | undefined, code: string): boolean {
  return !!cookie && sameText(cookie, accessToken(code));
}

/** Where to go after entering the code: a page on this site, never another site. */
export function safeNext(next: unknown): string {
  // Browsers drop tabs and newlines and read "\\" as "/", so any of those could turn "/x" into "//elsewhere".
  if (typeof next !== "string" || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return "/calendar";
  try {
    const url = new URL(next, "https://offshift.invalid");
    return url.origin === "https://offshift.invalid" ? `${url.pathname}${url.search}${url.hash}` : "/calendar";
  } catch {
    return "/calendar";
  }
}
