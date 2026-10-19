import { describe, expect, it } from "vitest";
import { createPrivateWatchStore } from "@/lib/watch-store";
import { pickData, useStore } from "@/lib/store";
import { recoveryPreview } from "@/lib/watch";

const activity = { date: "2026-09-16", start: "12:00", end: "16:00" };
const packet = { version: 1, device: "Garmin test watch", readings: [{ id: "one", recordedAt: "2026-09-16T14:00:00+10:00", bpm: 90 }] };

describe("private watch reflection state", () => {
  it("replaces demo readings with an imported batch, never mixing provenance", () => {
    const store = createPrivateWatchStore();
    store.getState().importReadings(packet, "2026-10-15T02:00:00+10:00");
    expect(store.getState().readings).toHaveLength(1);
    expect(store.getState().readings[0].origin).toBe("imported");
  });
  it("keeps existing readings when an import is invalid", () => {
    const store = createPrivateWatchStore();
    const before = store.getState().readings;
    expect(() => store.getState().importReadings({}, "2026-10-15T02:00:00+10:00")).toThrow();
    expect(store.getState().readings).toEqual(before);
  });
  it("stores optional reflections without writing to shared employer or assistant state", () => {
    const store = createPrivateWatchStore();
    const before = structuredClone(pickData(useStore.getState()));
    store.getState().saveReflection("s-wed", "  Tired after standing all day.  ");
    expect(store.getState().notes["s-wed"]).toBe("Tired after standing all day.");
    expect(pickData(useStore.getState())).toEqual(before);
  });
  it("does not schedule a preview; confirmation adds one private recovery block", () => {
    const store = createPrivateWatchStore();
    const plan = recoveryPreview(activity);
    expect(Object.values(store.getState().recoveries)).toHaveLength(0);
    store.getState().confirmRecovery("s-wed", plan);
    store.getState().confirmRecovery("s-wed", plan);
    expect(Object.values(store.getState().recoveries)).toEqual([plan]);
  });
  it("hides readings without deleting them and can erase all private data", () => {
    const store = createPrivateWatchStore();
    store.getState().loadDemo();
    store.getState().setShowReadings(false);
    expect(store.getState().readings.length).toBeGreaterThan(0);
    expect(store.getState().showReadings).toBe(false);
    store.getState().saveReflection("s-wed", "A long day");
    store.getState().confirmRecovery("s-wed", recoveryPreview(activity));
    store.getState().clearPrivateData();
    expect(store.getState().readings).toEqual([]);
    expect(store.getState().notes).toEqual({});
    expect(store.getState().recoveries).toEqual({});
  });
  it("restores private data from its own storage, outside the shared sync payload", async () => {
    const saved = new Map<string, string>();
    const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); }, removeItem: (key: string) => { saved.delete(key); } };
    const first = createPrivateWatchStore(storage);
    first.getState().saveReflection("s-wed", "Only in this browser");
    const second = createPrivateWatchStore(storage);
    await second.persist.rehydrate();
    expect(second.getState().notes["s-wed"]).toBe("Only in this browser");
    expect(pickData(useStore.getState())).not.toHaveProperty("notes");
    expect(pickData(useStore.getState())).not.toHaveProperty("readings");
  });
});

describe("private reflections and sessions", () => {
  it("start with no readings, and are cleared when a new session starts", () => {
    const store = createPrivateWatchStore();
    expect(store.getState().readings).toEqual([]);
    store.getState().forSession("2026-10-19T00:00:00.000Z");
    store.getState().saveReflection("s-wed", "Felt rushed");
    store.getState().confirmRecovery("s-wed", recoveryPreview(activity));
    store.getState().forSession("2026-10-19T00:00:00.000Z");
    expect(store.getState().notes["s-wed"]).toBe("Felt rushed");
    store.getState().forSession("2026-10-20T09:00:00.000Z");
    expect(store.getState().notes).toEqual({});
    expect(store.getState().recoveries).toEqual({});
  });
});
