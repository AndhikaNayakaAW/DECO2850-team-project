import { describe, expect, it } from "vitest";
import { applyResponse } from "@/lib/actions";
import { seedData } from "@/lib/scenario";

const JESS = "o-jess-thu";

describe("answering an ask, as pure data", () => {
  it("accepting books the shift, replies as Dinda and clears the ask's notifications", () => {
    const before = seedData();
    const r = applyResponse(before, JESS, "accept", "Yes, I can do tonight.")!;
    expect(r.data.offers[0].status).toBe("accepted");
    expect(r.data.shifts).toHaveLength(before.shifts.length + 1);
    expect(r.data.shifts.at(-1)).toMatchObject({ day: "Thu", start: "16:00", end: "21:00", viaOffer: JESS });
    expect(r.data.messages.at(-1)).toMatchObject({ from: "dinda", text: "Yes, I can do tonight.", offerId: JESS });
    expect(r.data.notifications.some((n) => n.offerId === JESS)).toBe(false);
    expect(r.toast).toContain("Jess");
  });
  it("declining sends the reply and books nothing", () => {
    const before = seedData();
    const r = applyResponse(before, JESS, "decline", "Not tonight, sorry.")!;
    expect(r.data.offers[0].status).toBe("declined");
    expect(r.data.shifts).toHaveLength(before.shifts.length);
    expect(r.data.messages.at(-1)?.text).toBe("Not tonight, sorry.");
  });
  it("deciding later sets a reminder and sends nothing", () => {
    const before = seedData();
    const r = applyResponse(before, JESS, "later", "")!;
    expect(r.data.offers[0]).toMatchObject({ status: "deferred", reminderAt: "13:32" });
    expect(r.data.messages).toHaveLength(before.messages.length);
    expect(r.data.notifications.some((n) => n.offerId === JESS)).toBe(true);
  });
  it("another time offers the first free slot, a swap names a colleague", () => {
    expect(applyResponse(seedData(), JESS, "negotiate", "Could do Friday morning.")!.data.offers[0]).toMatchObject({ status: "countered", alt: { label: "Fri 8–10 am" } });
    expect(applyResponse(seedData(), JESS, "swap", "Priya could take it.")!.data.offers[0]).toMatchObject({ status: "swap-requested", colleague: "Priya" });
  });
  it("leaves its input untouched and ignores unknown asks", () => {
    const before = seedData();
    const snapshot = JSON.stringify(before);
    applyResponse(before, JESS, "accept", "Yes.");
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(applyResponse(before, "nope", "accept", "Yes.")).toBeNull();
  });
});
