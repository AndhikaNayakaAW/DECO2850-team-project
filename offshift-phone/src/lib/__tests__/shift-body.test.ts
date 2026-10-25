import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { dayItems } from "@/lib/checks";
import { watchSummary } from "@/lib/garmin";
import { mergeData } from "@/lib/merge";
import { effortToSave } from "@/lib/effort";
import { LOAD_COLOUR, LOAD_WORDS, applyShiftBody, blockCount, blockTimes, describeSignal, forgetShiftBodies, parseShiftBody, shiftBodyDue, shiftWindow } from "@/lib/shift-body";
import { teamView } from "@/lib/team";
import type { DataSlice, Load, Shift } from "@/lib/types";
import { cleanData } from "@/lib/validate";
import { AT, week } from "./fixture";

process.env.OFFSHIFT_STATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "offshift-shift-body-")), "state.json");
const watchRoute = await import("@/app/api/watch/route");

/** Thursday 22 October, 1:02 pm in Brisbane: a morning shift that ended 17 minutes ago, 19 blocks of 15 minutes. */
const morning: Shift = { id: "s-thu-am", date: "2026-10-22", start: "08:00", end: "12:45", workplace: "Café" };
const withShift = (patch: Partial<Shift> = {}): DataSlice => ({ ...week(), shifts: [...week().shifts, { ...morning, ...patch }] });
const levels = (n: number, v: Load | null): (Load | null)[] => Array.from({ length: n }, () => v);
const secs = (iso: string) => Date.parse(iso) / 1000;
/** What the watch sends: the shift, the window it read, and one level per block. */
const reading = { shiftId: "s-thu-am", from: secs("2026-10-21T22:00:00Z"), to: secs("2026-10-22T02:45:00Z"), stress: levels(19, 2), heart: levels(19, 1) };
function stored(): DataSlice {
  const r = applyShiftBody(withShift(), reading, AT);
  if (!("data" in r)) throw new Error(`not stored: ${r.problem}`);
  return r.data;
}
const src = (file: string) => path.join(process.cwd(), "src", file);

describe("the watch reads each shift, 15 minutes at a time", () => {
  it("splits a shift into 15-minute blocks from its start, the last one shorter", () => {
    expect(blockCount(morning)).toBe(19);
    expect(blockTimes(morning)[0]).toEqual({ start: "08:00", end: "08:15" });
    expect(blockTimes(morning).at(-1)).toEqual({ start: "12:30", end: "12:45" });
    expect(blockCount({ start: "22:00", end: "02:00" })).toBe(16);
    expect(blockTimes({ start: "22:00", end: "02:00" }).at(-1)).toEqual({ start: "01:45", end: "02:00" });
    expect(blockTimes({ start: "13:00", end: "17:10" }).at(-1)).toEqual({ start: "17:00", end: "17:10" });
  });

  it("gives the watch the shift's window as instants, worked out in the worker's zone", () => {
    expect(shiftWindow(morning, "Australia/Brisbane")).toEqual({ from: secs("2026-10-21T22:00:00Z"), to: secs("2026-10-22T02:45:00Z") });
    expect(shiftWindow({ date: "2026-10-21", start: "22:00", end: "02:00" }, "Australia/Brisbane")).toEqual({ from: secs("2026-10-21T12:00:00Z"), to: secs("2026-10-21T16:00:00Z") });
    // Sydney is on daylight time in late October (UTC+11), unlike Brisbane.
    expect(shiftWindow(morning, "Australia/Sydney").from).toBe(secs("2026-10-21T21:00:00Z"));
  });

  it("asks for a shift's readings about 15 minutes after it ends, for 12 hours, until they arrive", () => {
    expect(shiftBodyDue(withShift(), AT)?.id).toBe("s-thu-am");
    expect(shiftBodyDue(withShift({ end: "12:55" }), AT)).toBeNull();
    expect(shiftBodyDue(withShift(), new Date("2026-10-22T15:00:00Z"))).toBeNull();
    expect(shiftBodyDue(stored(), AT)).toBeNull();
  });

  it("asks whether or not the worker rated the shift", () => {
    expect(shiftBodyDue(withShift({ effort: "busy" }), AT)?.id).toBe("s-thu-am");
    expect(shiftBodyDue(withShift({ effortSkipped: true }), AT)?.id).toBe("s-thu-am");
  });

  it("tells the watch which shift to read and when it ran", () => {
    expect(watchSummary(withShift(), AT).shiftBody).toEqual({ id: "s-thu-am", title: "Cafe, 8 am - 12:45 pm", from: secs("2026-10-21T22:00:00Z"), to: secs("2026-10-22T02:45:00Z") });
    expect(watchSummary(week(), AT).shiftBody).toBeNull();
  });
});

describe("what the calendar keeps", () => {
  it("takes only a level from 0 to 3, or no reading, per block, the same number for both signals", () => {
    expect(parseShiftBody({ shiftId: "s-thu-am", from: 100, to: 2800, stress: [0, 3, null], heart: [1, null, 2] })).toEqual({ shiftId: "s-thu-am", from: 100, to: 2800, stress: [0, 3, null], heart: [1, null, 2] });
    expect(parseShiftBody({ shiftId: "s-thu-am", stress: [0], heart: [1] })).toBeNull();
    expect(parseShiftBody({ shiftId: "s-thu-am", from: 1.5, to: 2800, stress: [0], heart: [1] })).toBeNull();
    const bad: unknown[] = [
      null,
      "stress",
      { stress: [1], heart: [1] },
      { shiftId: "s", stress: [4], heart: [1] },
      { shiftId: "s", stress: [1.5], heart: [1] },
      { shiftId: "s", stress: [72], heart: [118] },
      { shiftId: "s", stress: [1, 2], heart: [1] },
      { shiftId: "s", stress: [], heart: [] },
      { shiftId: "s", stress: levels(97, 1), heart: levels(97, 1) },
    ];
    for (const b of bad) expect(parseShiftBody(b)).toBeNull();
  });

  it("stores the blocks on that shift and sends no one anything", () => {
    const data = stored();
    expect(data.shifts.find((s) => s.id === "s-thu-am")?.body).toEqual({ receivedAt: AT.toISOString(), stress: reading.stress, heart: reading.heart });
    expect(data.messages).toEqual(week().messages);
  });

  it("refuses a shift that is missing, hasn't finished, or doesn't match the blocks", () => {
    expect(applyShiftBody(withShift(), { ...reading, shiftId: "nope" }, AT)).toEqual({ problem: "missing" });
    expect(applyShiftBody(withShift({ end: "18:00" }), reading, AT)).toEqual({ problem: "unfinished" });
    expect(applyShiftBody(withShift(), { ...reading, stress: levels(18, 2), heart: levels(18, 1) }, AT)).toEqual({ problem: "length" });
  });

  it("keeps the readings through validation and through a merge with the calendar's own edits", () => {
    const data = stored();
    expect(cleanData(data)).toEqual(data);
    const base = withShift();
    const client = { ...base, shifts: base.shifts.map((s) => (s.id === "s-mon" ? { ...s, end: "19:30" } : s)) };
    const merged = mergeData(base, data, client);
    expect(merged.shifts.find((s) => s.id === "s-thu-am")?.body?.stress).toEqual(reading.stress);
    expect(merged.shifts.find((s) => s.id === "s-mon")?.end).toBe("19:30");
  });

  it("forgets every shift's readings, and the log lines about them, when sharing is turned off on the watch", () => {
    const data = stored();
    expect(data.sync.at(-1)?.text).toBe("Read your Café shift, Thu 22 Oct 8 am–12:45 pm. Kept private.");
    const off = forgetShiftBodies(data, AT);
    expect(off.shifts.every((s) => !s.body)).toBe(true);
    expect(off.sync.some((e) => e.text.startsWith("Read your"))).toBe(false);
    expect(off.sync.at(-1)?.text).toBe("Sharing turned off on the watch. The calendar forgot the shift readings.");
    expect(forgetShiftBodies(off, AT)).toBe(off);
  });

  it("never shows the readings to the team", () => {
    expect(JSON.stringify(teamView(stored(), 1, null))).not.toMatch(/stress|heart|body|Read your/i);
  });
});

describe("the calendar shows them along each shift", () => {
  it("puts the readings on the shift's item in the week", () => {
    expect(dayItems(stored(), "2026-10-22").find((it) => it.id === "s-thu-am")?.body?.stress).toHaveLength(19);
  });

  it("names Garmin's stress bands and the heart-rate-reserve bands in words, on one grey ramp", () => {
    expect(LOAD_WORDS.stress).toEqual(["Resting", "Low", "Medium", "High"]);
    expect(LOAD_WORDS.heart).toEqual(["Very light", "Light", "Moderate", "Vigorous"]);
    expect(LOAD_COLOUR).toEqual(["#E2E2DE", "#B9BAB4", "#8E908A", "#62645F"]);
  });

  it("sums a shift up in one plain sentence per signal, with where the peak was", () => {
    expect(describeSignal([0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 1], "stress")).toBe("Stress mostly low, high for 45 min near the end.");
    expect(describeSignal([2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0], "heart")).toBe("Heart mostly very light, moderate for 1 hour early on.");
    expect(describeSignal([1, 1, 1, 1], "stress")).toBe("Stress low throughout.");
    expect(describeSignal([1, 1, null, null, null, 1], "stress")).toBe("Stress mostly low. No reading for 45 min.");
    expect(describeSignal([null, null], "heart")).toBe("No heart reading from your watch.");
  });

  it("never advises, diagnoses or judges", () => {
    for (const sig of ["stress", "heart"] as const)
      for (const lv of [0, 1, 2, 3] as Load[]) {
        expect(describeSignal([lv, lv, 3, 3, 0, null], sig)).not.toMatch(/should|too |need|rest up|careful|bad|good|healthy|unhealthy|danger|risk/i);
      }
  });
});

describe("only the shift's heart rate and stress", () => {
  it("leaves out the all-day readings: no Body Battery, sleep, breathing, pulse ox, recovery or daily band", () => {
    for (const f of ["components/board/CalendarBoard.tsx", "components/board/Week3D.tsx", "components/board/AskPanel.tsx", "components/board/ItemForm.tsx", "components/board/Immersive.tsx", "lib/checks.ts", "lib/garmin.ts"]) {
      expect(readFileSync(src(f), "utf8")).not.toMatch(/Body Battery|recharge|pulse ?ox|breathing|BodyCard|bodyDays|wearable|Read flat/i);
    }
    for (const gone of ["lib/body-week.ts", "lib/body.ts", "components/board/BodyCard.tsx"]) expect(existsSync(src(gone))).toBe(false);
  });

  it("drops the old all-day readings from a saved week", () => {
    const old = { ...week(), wearable: { level: 1, word: "Running low", at: "12:55", source: "Garmin", signals: { energy: 1 } }, bodyDays: [{ date: "2026-10-21", at: "21:00", receivedAt: AT.toISOString(), signals: { energy: 2 } }] };
    const clean = cleanData(old)!;
    expect(clean).not.toBeNull();
    expect(JSON.stringify(clean)).not.toMatch(/wearable|bodyDays|Running low|energy/);
  });
});

describe("/api/watch and a shift's readings", () => {
  const g = globalThis as { __offshiftState?: { version: number; client: string | null; data: DataSlice } };
  const post = (body: unknown) => watchRoute.POST(new Request("http://x/api/watch", { method: "POST", body: JSON.stringify(body) }));
  const shift = () => g.__offshiftState!.data.shifts.find((s) => s.id === "s-thu-am")!;
  beforeEach(() => {
    g.__offshiftState = { version: 0, client: null, data: withShift() };
  });

  it("stores a shift's readings from the watch, and stops asking for them", async () => {
    const res = await post({ shiftBody: reading });
    expect(res.status).toBe(200);
    expect((await res.json()).shiftBody).toBeNull();
    expect(shift().body?.heart).toEqual(reading.heart);
  });

  it("refuses readings it can't use", async () => {
    expect((await post({ shiftBody: { shiftId: "s-thu-am", stress: [72], heart: [118] } })).status).toBe(400);
    expect((await post({ shiftBody: { ...reading, shiftId: "nope" } })).status).toBe(404);
    expect((await post({ shiftBody: { ...reading, stress: [1], heart: [1] } })).status).toBe(400);
    expect((await post({ shiftBody: { shiftId: "s-thu-am", stress: reading.stress, heart: reading.heart } })).status).toBe(400);
    expect(shift().body).toBeUndefined();
  });

  it("forgets the shift readings when sharing is turned off, whichever watch build asks", async () => {
    await post({ shiftBody: reading });
    expect((await post({ health: { share: false } })).status).toBe(200);
    expect(shift().body).toBeUndefined();
  });
});

describe("a shift's readings stay right through edits and sharing off", () => {
  const body = { receivedAt: AT.toISOString(), stress: reading.stress, heart: reading.heart };
  const edit = (d: DataSlice, patch: Partial<Shift>) => ({ ...d, shifts: d.shifts.map((s) => (s.id === "s-thu-am" ? { ...s, ...patch } : s)) });

  it("keeps readings the watch stored while the calendar was changing that shift's rating", () => {
    const base = withShift();
    const server = edit(base, { body });
    const client = edit(base, { effort: "busy" });
    const merged = mergeData(base, server, client).shifts.find((s) => s.id === "s-thu-am")!;
    expect(merged.effort).toBe("busy");
    expect(merged.body?.stress).toEqual(reading.stress);
  });

  it("keeps forgotten readings forgotten when the calendar edits a shift after sharing was turned off", () => {
    const base = edit(withShift(), { body });
    const server = edit(base, { body: undefined });
    const client = edit(base, { workplace: "Café on George St" });
    const merged = mergeData(base, server, client).shifts.find((s) => s.id === "s-thu-am")!;
    expect(merged.workplace).toBe("Café on George St");
    expect(merged.body).toBeUndefined();
  });

  it("drops readings taken for a shift's old times when the calendar moves it", () => {
    const base = withShift();
    const server = edit(base, { body });
    const client = edit(base, { start: "07:00", end: "11:45" });
    const merged = mergeData(base, server, client).shifts.find((s) => s.id === "s-thu-am")!;
    expect(merged.start).toBe("07:00");
    expect(merged.body).toBeUndefined();
  });

  it("refuses readings taken for a window the shift no longer has", () => {
    const moved = withShift({ start: "07:00", end: "11:45" });
    expect(applyShiftBody(moved, reading, AT)).toEqual({ problem: "moved" });
  });

  it("stores the same readings once, however many times they arrive", () => {
    const once = stored();
    const twice = applyShiftBody(once, reading, AT);
    expect("data" in twice && twice.data).toBe(once);
  });

  it("forgets the log lines about readings even when no shift has readings left", () => {
    const read = stored();
    const gone = { ...read, shifts: read.shifts.filter((s) => s.id !== "s-thu-am") };
    expect(forgetShiftBodies(gone, AT).sync.some((e) => e.text.startsWith("Read your"))).toBe(false);
  });

  it("tells the watch how many shifts still carry readings, so a lost 'sharing off' can be sent again", () => {
    expect(watchSummary(stored(), AT).readings).toBe(1);
    expect(watchSummary(withShift(), AT).readings).toBe(0);
  });

  it("only saves a rating from the edit form when the worker changed it there", () => {
    expect(effortToSave("hard", "hard")).toBeUndefined();
    expect(effortToSave(undefined, undefined)).toBeUndefined();
    expect(effortToSave(undefined, "busy")).toBe("busy");
    expect(effortToSave("busy", undefined)).toBeNull();
  });

  it("draws in immersive mode the signal the worker chose", () => {
    expect(readFileSync(src("components/board/Immersive.tsx"), "utf8")).not.toMatch(/bodySignal="stress"/);
  });
});

describe("/api/watch refuses readings for a shift that moved", () => {
  const g = globalThis as { __offshiftState?: { version: number; client: string | null; data: DataSlice } };
  it("answers 409 so the watch reads the new window instead", async () => {
    g.__offshiftState = { version: 0, client: null, data: withShift({ start: "07:00", end: "11:45" }) };
    const res = await watchRoute.POST(new Request("http://x/api/watch", { method: "POST", body: JSON.stringify({ shiftBody: reading }) }));
    expect(res.status).toBe(409);
  });
});

describe("readings travel from the watch as plain text", () => {
  const g = globalThis as { __offshiftState?: { version: number; client: string | null; data: DataSlice } };
  const post = (body: unknown) => watchRoute.POST(new Request("http://x/api/watch", { method: "POST", body: JSON.stringify(body) }));

  it("takes one character per 15 minutes, 0 to 3 or - for no reading, so the watch never has to send a list or a null", () => {
    expect(parseShiftBody({ ...reading, stress: "21-3", heart: "0012" })).toEqual({ ...reading, stress: [2, 1, null, 3], heart: [0, 0, 1, 2] });
    for (const bad of ["", "1x", "4", "12-", "1".repeat(97)]) expect(parseShiftBody({ ...reading, stress: bad, heart: "1" })).toBeNull();
  });

  it("stores readings sent as text", async () => {
    g.__offshiftState = { version: 0, client: null, data: withShift() };
    const text = "2".repeat(19);
    expect((await post({ shiftBody: { ...reading, stress: text, heart: "1".repeat(19) } })).status).toBe(200);
    expect(g.__offshiftState.data.shifts.find((s) => s.id === "s-thu-am")?.body?.stress).toEqual(levels(19, 2));
  });

  it("notes privately when it couldn't store a reading, once, so a failed send can be seen", async () => {
    g.__offshiftState = { version: 0, client: null, data: withShift({ start: "07:00", end: "11:45" }) };
    await post({ shiftBody: reading });
    await post({ shiftBody: reading });
    const notes = g.__offshiftState.data.sync.filter((e) => e.text.startsWith("A reading from the watch wasn't stored"));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ from: "Watch", to: "Only you" });
    expect(JSON.stringify(teamView(g.__offshiftState.data, 1, null))).not.toMatch(/reading from the watch/);
  });
});
