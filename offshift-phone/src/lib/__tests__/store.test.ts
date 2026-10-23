import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dayItems } from "@/lib/checks";
import { pickData, useStore } from "@/lib/store";
import { AT, week } from "./fixture";

const data = () => pickData(useStore.getState());

describe("the shared calendar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AT);
    useStore.setState({ ...week(), toast: null });
  });
  afterEach(() => vi.useRealTimers());

  it("turns an accepted ask into a shift and takes the amber block off the day", () => {
    expect(dayItems(data(), "2026-10-22").some((it) => it.kind === "offer")).toBe(true);
    useStore.getState().respondToOffer("o-thu", "accept");
    expect(data().offers[0].status).toBe("accepted");
    const thu = dayItems(data(), "2026-10-22");
    expect(thu.some((it) => it.kind === "offer")).toBe(false);
    expect(thu.find((it) => it.kind === "shift")).toMatchObject({ start: "16:00", end: "21:00", workplace: "Café" });
    expect(useStore.getState().toast).toBe("Added to your week.");
  });
  it("undoes an answer: the ask waits again and its shift comes off the day", () => {
    useStore.getState().respondToOffer("o-thu", "accept");
    useStore.getState().unanswerOffer("o-thu");
    expect(data().offers[0].status).toBe("pending");
    const thu = dayItems(data(), "2026-10-22");
    expect(thu.some((it) => it.kind === "offer")).toBe(true);
    expect(thu.some((it) => it.kind === "shift" && it.start === "16:00")).toBe(false);
  });
  it("keeps an ask for later on the day, see-through, with no reminder", () => {
    useStore.getState().respondToOffer("o-thu", "later");
    expect(dayItems(data(), "2026-10-22").find((it) => it.kind === "offer")).toMatchObject({ later: true });
    expect(useStore.getState().toast).toBe("Kept for later. Press it on your week when you're ready.");
  });
  it("puts a removed item back where undo expects it", () => {
    const tutorial = data().uni[0];
    useStore.getState().removeUni(tutorial.id);
    expect(data().uni.some((u) => u.id === tutorial.id)).toBe(false);
    useStore.getState().restore("uni", tutorial);
    useStore.getState().restore("uni", tutorial);
    expect(data().uni.filter((u) => u.id === tutorial.id)).toHaveLength(1);
  });
  it("keeps a protected plan's importance honest when protection is lifted", () => {
    useStore.getState().updatePersonal("p-tue", { importance: "protected" });
    useStore.getState().setProtected("p-tue", true);
    expect(data().settings.protectedIds).toContain("p-tue");
    useStore.getState().setProtected("p-tue", false);
    expect(data().settings.protectedIds).not.toContain("p-tue");
    expect(data().personal.find((p) => p.id === "p-tue")?.importance).toBe("important");
  });
  it("starts a new session empty, with nothing from the last participant", () => {
    useStore.getState().addPersonal({ date: "2026-10-19", start: "18:00", end: "19:00", title: "Gym", category: "personal", importance: "flexible" });
    useStore.getState().newSession();
    const d = data();
    expect([d.shifts, d.uni, d.personal, d.offers, d.messages, d.sync].every((xs) => xs.length === 0)).toBe(true);
    expect(d.settings.name).toBe("");
    useStore.getState().loadExample();
    expect(data().shifts.length).toBeGreaterThan(0);
    expect(data().offers).toHaveLength(0);
  });
  it("never loads a week saved by an older version", () => {
    const merge = useStore.persist.getOptions().merge!;
    const current = useStore.getState();
    expect(merge({ clock: "13:02", shifts: [{ id: "s1", employer: "pandora", day: "Thu" }] }, current)).toBe(current);
    expect((merge(week(), current) as typeof current).settings.name).toBe("Sam");
  });
});
