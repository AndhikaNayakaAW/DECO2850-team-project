import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dayItems } from "@/lib/checks";
import { EFFORTS, EFFORT_COLOUR, applyEffort, checkInDue } from "@/lib/effort";
import { watchSummary } from "@/lib/garmin";
import { teamView } from "@/lib/team";
import type { DataSlice, Shift } from "@/lib/types";
import { cleanData } from "@/lib/validate";
import { AT, week } from "./fixture";

process.env.OFFSHIFT_STATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "offshift-checkin-")), "state.json");
const watchRoute = await import("@/app/api/watch/route");

/** Thursday 22 October, 1:02 pm in Brisbane: a morning shift that ended 17 minutes ago. */
const morning: Shift = { id: "s-thu-am", date: "2026-10-22", start: "08:00", end: "12:45", workplace: "Café" };
const withShift = (patch: Partial<Shift> = {}): DataSlice => ({ ...week(), shifts: [...week().shifts, { ...morning, ...patch }] });
const at = (iso: string) => new Date(iso);

describe("the watch asks how the work was, once, after a shift", () => {
  it("asks about a shift about 15 minutes after it ends, and not before", () => {
    expect(checkInDue(withShift(), AT)?.id).toBe("s-thu-am");
    expect(checkInDue(withShift({ end: "12:55" }), AT)).toBeNull();
  });

  it("stops asking 12 hours after the end, once rated, and once skipped", () => {
    expect(checkInDue(withShift(), at("2026-10-22T15:00:00Z"))).toBeNull();
    expect(checkInDue(withShift({ effort: "busy" }), AT)).toBeNull();
    expect(checkInDue(withShift({ effortSkipped: true }), AT)).toBeNull();
  });

  it("counts a shift past midnight as ending the next morning", () => {
    const close = withShift({ date: "2026-10-21", start: "22:00", end: "02:00" });
    expect(checkInDue(close, at("2026-10-21T16:20:00Z"))?.id).toBe("s-thu-am");
  });

  it("saves one of four work words on that shift, and sends no message", () => {
    expect(EFFORTS).toEqual(["light", "steady", "busy", "hard"]);
    const r = applyEffort(withShift(), "s-thu-am", "busy", AT)!;
    expect(r.data.shifts.find((s) => s.id === "s-thu-am")?.effort).toBe("busy");
    expect(r.data.messages).toEqual(week().messages);
    expect(r.toast).toBe("Saved: Busy. Change it on your calendar.");
    expect(checkInDue(r.data, AT)).toBeNull();
  });

  it("records a skip as a skip, never as a rating", () => {
    const r = applyEffort(withShift(), "s-thu-am", "skip", AT)!;
    const shift = r.data.shifts.find((s) => s.id === "s-thu-am")!;
    expect(shift.effortSkipped).toBe(true);
    expect(shift.effort).toBeUndefined();
  });

  it("can't rate a shift that hasn't finished or doesn't exist", () => {
    expect(applyEffort(withShift({ end: "18:00" }), "s-thu-am", "hard", AT)).toBeNull();
    expect(applyEffort(withShift(), "nope", "hard", AT)).toBeNull();
  });

  it("tells the watch which shift to ask about, in plain text", () => {
    expect(watchSummary(withShift(), AT).checkIn).toEqual({ id: "s-thu-am", title: "Cafe, 8 am - 12:45 pm" });
    expect(watchSummary(week(), AT).checkIn).toBeNull();
  });

  it("takes the answer from the watch, and refuses anything else", async () => {
    const g = globalThis as { __offshiftState?: { version: number; client: string | null; data: DataSlice } };
    const post = (body: unknown) => watchRoute.POST(new Request("http://x/api/watch", { method: "POST", body: JSON.stringify(body) }));
    g.__offshiftState = { version: 0, client: null, data: withShift() };
    const ok = await post({ effort: { shiftId: "s-thu-am", level: "hard" } });
    expect(ok.status).toBe(200);
    expect(g.__offshiftState.data.shifts.find((s) => s.id === "s-thu-am")?.effort).toBe("hard");
    expect((await post({ effort: { shiftId: "s-thu-am", level: "terrible" } })).status).toBe(400);
    expect((await post({ effort: { shiftId: "nope", level: "hard" } })).status).toBe(404);
  });
});

describe("the calendar shows how the work was", () => {
  it("puts the word on the shift and colours it along a violet ramp, darker for harder", () => {
    const item = dayItems(withShift({ effort: "hard" }), "2026-10-22").find((it) => it.id === "s-thu-am")!;
    expect(item.effort).toBe("hard");
    expect(item.status).toContain("Hard");
    expect(EFFORT_COLOUR).toEqual({ light: "#E5D8F0", steady: "#C3ABD2", busy: "#A382B3", hard: "#805C8C" });
  });

  it("keeps the work rating apart from the body rating", () => {
    const item = dayItems(withShift({ effort: "light", rated: "wiped" }), "2026-10-22").find((it) => it.id === "s-thu-am")!;
    expect(item.effort).toBe("light");
    expect(item.warn).toBe("rated Wiped");
  });

  it("keeps a saved week's ratings, and refuses words it doesn't know", () => {
    expect(cleanData(withShift({ effort: "steady", effortSkipped: undefined }))?.shifts.at(-1)?.effort).toBe("steady");
    expect(cleanData(withShift({ effortSkipped: true }))?.shifts.at(-1)?.effortSkipped).toBe(true);
    expect(cleanData(withShift({ effort: "terrible" as never }))).toBeNull();
  });

  it("never shows the ratings to the team", () => {
    const json = JSON.stringify(teamView(withShift({ effort: "hard" }), 1, null));
    expect(json).not.toMatch(/effort|hard/i);
  });
});
