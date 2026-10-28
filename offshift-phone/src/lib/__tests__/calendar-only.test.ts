import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import config from "../../../next.config";

const src = path.resolve(import.meta.dirname, "../..");
const app = path.join(src, "app");

/** Every file under `dir`, skipping the API routes: those serve the watch and the calendar, not pages. */
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return full === path.join(app, "api") ? [] : files(full);
    return [full];
  });
}

describe("the week is the whole website", () => {
  it("serves only the calendar, the exhibition demo, the field test week, the access form and the redirect to the calendar", () => {
    const pages = files(app).filter((f) => path.basename(f) === "page.tsx").map((f) => "/" + path.relative(app, path.dirname(f)).replaceAll("\\", "/"));
    expect(pages.map((p) => p.replace(/\/$/, "") || "/").sort()).toEqual(["/", "/access", "/calendar", "/demo", "/field-testing"]);
  });

  it("links to no research console, watch preview or daily reflection", () => {
    const screens = [...files(app), ...files(path.join(src, "components"))].filter((f) => /\.tsx?$/.test(f));
    const leftovers = screens.filter((f) => /["'`]\/(team|watch)["'`?/#]|view=day|get\(["']view["']\)/.test(readFileSync(f, "utf8")));
    expect(leftovers.map((f) => path.relative(src, f))).toEqual([]);
  });

  it("sends old links to the removed pages to the week instead of a missing page", async () => {
    const redirects = (await config.redirects?.()) ?? [];
    expect(redirects).toEqual(expect.arrayContaining([
      { source: "/team", destination: "/calendar", permanent: false },
      { source: "/watch", destination: "/calendar", permanent: false },
    ]));
  });
});
