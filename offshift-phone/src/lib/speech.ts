"use client";

/** One voice for the immersive calendar: short lines, never two at once, a pause between them, always captioned. */
export interface Speaker {
  say: (text: string, opts?: { force?: boolean }) => void;
  /** Speaks and resolves when the line has finished (or after a reading-time estimate when muted). */
  sayAsync: (text: string) => Promise<void>;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  stop: () => void;
}

const VOICE_PREFS = ["Daniel", "Karen", "Moira", "Samantha", "Google UK English Male", "Google UK English Female", "Microsoft Ryan", "Microsoft Sonia"];

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  for (const name of VOICE_PREFS) {
    const v = voices.find((x) => x.name.startsWith(name));
    if (v) return v;
  }
  return voices.find((v) => /^en-(AU|GB)/.test(v.lang)) || voices.find((v) => v.lang.startsWith("en")) || null;
}

export function forSpeech(text: string): string {
  return text
    .replace(/(\d)\s*–\s*(\d)/g, "$1 to $2")
    .replace(/–/g, " to ")
    .replace(/ · /g, ", ")
    .replace(/\s*\((Calendar|myUQ|Offshift)\)/g, "");
}

export function createSpeaker(onCaption: (text: string) => void, cooldownMs = 900): Speaker {
  let muted = false;
  let lastAt = 0;
  let lastText = "";
  let queued: ReturnType<typeof setTimeout> | null = null;
  const canSpeak = typeof speechSynthesis !== "undefined";
  try {
    if (canSpeak) speechSynthesis.getVoices();
  } catch {}

  function speakNow(text: string): Promise<void> {
    lastAt = Date.now();
    lastText = text;
    onCaption(text);
    const estimate = Math.min(9000, 700 + text.length * 55);
    if (muted || !canSpeak) return new Promise((r) => setTimeout(r, estimate));
    return new Promise((resolve) => {
      let done = false;
      const started = Date.now();
      const finish = () => {
        if (done) return;
        done = true;
        // captions need reading time even when the voice ends early or is missing
        const minimum = Math.max(0, estimate * 0.7 - (Date.now() - started));
        setTimeout(resolve, minimum);
      };
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(forSpeech(text));
        const v = pickVoice();
        if (v) u.voice = v;
        u.rate = 1;
        u.pitch = 1;
        u.onend = finish;
        u.onerror = finish;
        speechSynthesis.speak(u);
        setTimeout(finish, estimate + 2500);
      } catch {
        setTimeout(finish, estimate);
      }
    });
  }

  return {
    say(text, opts) {
      if (!text) return;
      if (!opts?.force && text === lastText && Date.now() - lastAt < 4000) return; // never repeat the same line back to back
      if (queued) clearTimeout(queued);
      const wait = Math.max(0, cooldownMs - (Date.now() - lastAt));
      if (wait === 0) speakNow(text);
      else queued = setTimeout(() => speakNow(text), wait);
    },
    sayAsync(text) {
      if (!text) return Promise.resolve();
      if (queued) clearTimeout(queued);
      const wait = Math.max(0, cooldownMs - (Date.now() - lastAt));
      return new Promise((resolve) => {
        queued = setTimeout(() => speakNow(text).then(resolve), wait);
      });
    },
    setMuted(m) {
      muted = m;
      if (m && canSpeak) {
        try {
          speechSynthesis.cancel();
        } catch {}
      }
    },
    isMuted: () => muted,
    stop() {
      if (queued) clearTimeout(queued);
      if (canSpeak) {
        try {
          speechSynthesis.cancel();
        } catch {}
      }
    },
  };
}
