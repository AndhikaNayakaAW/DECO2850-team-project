import { describe, expect, it } from "vitest";
import { BODY_SIGNALS, bodyNotes, bodySentence, bodyState, overallLevel, signalWord } from "@/lib/body";
import type { Wearable } from "@/lib/types";

const watch = (signals: Wearable["signals"], level: Wearable["level"] = 1, word = "Running low"): Wearable => ({ level, word, at: "21:02", source: "Garmin", signals });

describe("the overall body reading", () => {
  it("follows Body Battery, which already blends sleep, stress and heart-rate variability", () => {
    expect(overallLevel({ energy: 3, sleep: 0, stress: 0 })).toBe(3);
    expect(overallLevel({ energy: 1 })).toBe(1);
  });
  it("has no overall reading without Body Battery, which means the watch isn't being worn", () => {
    expect(overallLevel({ sleep: 0, stress: 1 })).toBeNull();
    expect(overallLevel({ breathing: 3, pulseOx: 3, recovery: 3 })).toBeNull();
    expect(overallLevel({})).toBeNull();
  });
});

describe("body words", () => {
  it("uses Garmin's own bands for each signal", () => {
    expect(signalWord("stress", 3)).toBe("Resting");
    expect(signalWord("stress", 0)).toBe("High");
    expect(signalWord("sleep", 2)).toBe("Fair");
    expect(signalWord("heart", 3)).toBe("As usual");
  });
  it("lists every signal the watch can send, energy first", () => {
    expect(BODY_SIGNALS[0]).toBe("energy");
    expect(BODY_SIGNALS).toEqual(["energy", "sleep", "stress", "heart", "breathing", "pulseOx", "recovery"]);
  });
  it("names only the steady signals reading low, in plain words", () => {
    expect(bodyNotes({ energy: 1, sleep: 1, stress: 1, heart: 3, breathing: 2, pulseOx: 3, recovery: 1 })).toBe("a poor night's sleep, medium stress and recovery still under way");
    expect(bodyNotes({ energy: 0, sleep: 3, stress: 2 })).toBe("");
    expect(bodyNotes({ heart: 0, recovery: 0 })).toBe("a resting heart rate well above your usual and a long recovery still to go");
  });
  it("never lets a single breathing or pulse ox reading speak for the body, since walking upstairs changes them", () => {
    expect(bodyNotes({ energy: 3, breathing: 0, pulseOx: 1 })).toBe("");
  });
  it("puts it into one sentence that states what the watch reads and never advises", () => {
    expect(bodySentence(watch({ energy: 1, sleep: 1, stress: 1 }))).toBe("Your watch reads running low, with a poor night's sleep and medium stress.");
    expect(bodySentence(watch({ energy: 3 }, 3, "Plenty of energy"))).toBe("Your watch reads plenty of energy.");
    for (const level of [0, 1, 2, 3] as const) {
      expect(bodySentence(watch({ energy: level, sleep: level, stress: level, heart: level }, level))).not.toMatch(/should|rest up|take it|don't|sick|ill\b/i);
    }
  });
});

describe("the colour of a reading", () => {
  it("follows the overall level, and turns amber when another signal reads low", () => {
    expect(bodyState(watch({ energy: 3 }, 3, "Plenty of energy"))).toBe("ok");
    expect(bodyState(watch({ energy: 3, sleep: 0 }, 3, "Plenty of energy"))).toBe("warn");
    expect(bodyState(watch({ energy: 1 }))).toBe("warn");
    expect(bodyState(watch({ energy: 0, sleep: 0 }, 0, "Very low"))).toBe("bad");
    expect(bodyState(watch({ energy: 3, breathing: 1 }, 3, "Plenty of energy"))).toBe("ok");
  });
});
