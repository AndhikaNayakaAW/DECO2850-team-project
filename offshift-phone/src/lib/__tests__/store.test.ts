import { describe, expect, it } from "vitest";
import { buildDays } from "@/lib/checks";
import { pickData, useStore } from "@/lib/store";

describe("the shared scenario", () => {
  it("turns an accepted ask into a shift and hides the amber block", () => {
    const s = useStore.getState();
    s.resetDemo();
    const before = buildDays(pickData(useStore.getState()));
    expect(before.find((d) => d.day === "Thu")!.items.some((it) => it.kind === "offer")).toBe(true);
    s.respondToOffer("o-jess-thu", "accept", "Yes, I can do tonight.");
    const after = pickData(useStore.getState());
    expect(after.offers[0].status).toBe("accepted");
    expect(after.shifts).toHaveLength(6);
    expect(buildDays(after).find((d) => d.day === "Thu")!.items.some((it) => it.kind === "offer")).toBe(false);
  });
  it("reset brings Jess's ask back and clears every change", () => {
    const s = useStore.getState();
    s.respondToOffer("o-jess-thu", "decline", "Not tonight.");
    s.addPersonal({ day: "Mon", start: "18:00", end: "19:00", title: "Gym" });
    s.resetDemo();
    const d = pickData(useStore.getState());
    expect(d.offers[0].status).toBe("pending");
    expect(d.shifts).toHaveLength(5);
    expect(d.personal.some((p) => p.title === "Gym")).toBe(false);
    expect(d.clock).toBe("13:02");
    expect(buildDays(d).find((x) => x.day === "Thu")!.items.some((it) => it.kind === "offer")).toBe(true);
  });
});
