import { NextResponse } from "next/server";
import { ACCESS_COOKIE, ACCESS_DAYS, accessCode, accessToken, codeMatches } from "@/lib/access";

export const dynamic = "force-dynamic";

/** Checks the access code and, when it matches, lets this browser in. */
export async function POST(req: Request) {
  const code = accessCode();
  if (!code) return NextResponse.json({ ok: true });
  let input: { code?: unknown } = {};
  try {
    input = await req.json();
  } catch {}
  if (!codeMatches(input?.code, code)) {
    // Slows down anyone guessing.
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "That code doesn't match." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ACCESS_COOKIE,
    value: accessToken(code),
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: ACCESS_DAYS * 24 * 3600,
  });
  return res;
}
