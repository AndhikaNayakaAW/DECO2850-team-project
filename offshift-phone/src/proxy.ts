import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, accessCode, codeMatches, hasAccess, safeNext } from "@/lib/access";

/**
 * With an access code set (OFFSHIFT_ACCESS_CODE), only people who entered it can open Offshift or its API.
 * The watch carries the code in its server address instead: https://…/w/<code>, then /api/watch as usual.
 * Leaving the code unset opens the prototype directly and preserves older installed watch addresses.
 */
export function proxy(req: NextRequest) {
  const code = accessCode();
  const { pathname, search } = req.nextUrl;
  // The exhibition's demo watch build has /demo after the site (and after /w/<code>): it reads the demo week.
  const watch = /^(?:\/w\/([^/]+))?(\/demo)?\/api\/watch$/.exec(pathname);
  const coded = !!watch && watch[1] !== undefined;
  const demo = !!watch && watch[2] !== undefined;
  const target = new URL(`${demo ? "/api/demo/watch" : "/api/watch"}${search}`, req.url);
  if (!code) {
    // Existing watches have the old address compiled in. Keep their connection after opening the site.
    if (coded || demo) return NextResponse.rewrite(target);
    if (pathname === "/access") return NextResponse.redirect(new URL(safeNext(req.nextUrl.searchParams.get("next")), req.url));
    return NextResponse.next();
  }

  if (coded) {
    let given = "";
    try {
      given = decodeURIComponent(watch![1]);
    } catch {}
    return codeMatches(given, code) ? NextResponse.rewrite(target) : NextResponse.json({ error: "Wrong access code" }, { status: 401 });
  }
  if (demo) return NextResponse.json({ error: "Enter the access code first" }, { status: 401 });
  if (pathname === "/access" || pathname === "/api/access") return NextResponse.next();
  if (hasAccess(req.cookies.get(ACCESS_COOKIE)?.value, code)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Enter the access code first" }, { status: 401 });

  const to = new URL("/access", req.url);
  to.search = new URLSearchParams({ next: `${pathname}${search}` }).toString();
  return NextResponse.redirect(to);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
