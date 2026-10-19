import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/access/route";
import { ACCESS_COOKIE, accessToken, safeNext } from "@/lib/access";
import { proxy } from "@/proxy";

const CODE = "maple-river-42";
const req = (path: string, cookie?: string) => new NextRequest(`https://offshift.example${path}`, cookie ? { headers: { cookie: `${ACCESS_COOKIE}=${cookie}` } } : undefined);
const passes = (r: Response) => r.headers.get("x-middleware-next") === "1";
const enter = (code: unknown) => POST(new Request("https://offshift.example/api/access", { method: "POST", body: JSON.stringify({ code }) }));

describe("without an access code", () => {
  it("lets every page and the API through, as on a laptop", () => {
    delete process.env.OFFSHIFT_ACCESS_CODE;
    expect(passes(proxy(req("/calendar")))).toBe(true);
    expect(passes(proxy(req("/api/state")))).toBe(true);
  });
});

describe("with an access code", () => {
  beforeEach(() => {
    process.env.OFFSHIFT_ACCESS_CODE = CODE;
  });
  afterEach(() => {
    delete process.env.OFFSHIFT_ACCESS_CODE;
  });

  it("sends a browser that hasn't entered it to the access page, remembering where it was going", () => {
    const r = proxy(req("/calendar?view=day"));
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toBe("https://offshift.example/access?next=%2Fcalendar%3Fview%3Dday");
    expect(passes(proxy(req("/access")))).toBe(true);
  });

  it("refuses the API without it, and opens everything once it's entered", () => {
    expect(proxy(req("/api/state")).status).toBe(401);
    expect(passes(proxy(req("/team", accessToken(CODE))))).toBe(true);
    expect(passes(proxy(req("/api/state", accessToken(CODE))))).toBe(true);
    expect(proxy(req("/team", accessToken("last-month's-code"))).status).toBe(307);
  });

  it("lets the watch in with the code in its server address, and nothing else", () => {
    expect(proxy(req(`/w/${CODE}/api/watch`)).headers.get("x-middleware-rewrite")).toBe("https://offshift.example/api/watch");
    expect(proxy(req("/w/guess/api/watch")).status).toBe(401);
    expect(proxy(req("/api/watch")).status).toBe(401);
  });

  it("lets a browser in only for the right code, with a cookie scripts can't read", async () => {
    const wrong = await enter("maple");
    expect(wrong.status).toBe(401);
    expect(wrong.headers.get("set-cookie")).toBeNull();
    const right = await enter(` ${CODE} `);
    expect(right.status).toBe(200);
    const cookie = right.headers.get("set-cookie")!;
    expect(cookie).toContain(`${ACCESS_COOKIE}=${accessToken(CODE)}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).not.toContain(CODE);
  });

  it("only ever returns to a page on this site", () => {
    expect(safeNext("/team")).toBe("/team");
    expect(safeNext("//elsewhere.example")).toBe("/calendar");
    expect(safeNext("https://elsewhere.example")).toBe("/calendar");
    expect(safeNext(undefined)).toBe("/calendar");
    expect(safeNext("/\t/elsewhere.example")).toBe("/calendar");
    expect(safeNext("/\\elsewhere.example")).toBe("/calendar");
    expect(safeNext("/calendar?view=day&date=2026-10-22")).toBe("/calendar?view=day&date=2026-10-22");
  });
});
