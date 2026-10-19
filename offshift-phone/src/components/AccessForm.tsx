"use client";

import { useState } from "react";

/** One field for the code the research team hands out. The browser remembers it once it matches. */
export default function AccessForm({ next }: { next: string }) {
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setProblem("Enter the code from the research team.");
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch("/api/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      if (res.ok) {
        window.location.replace(next);
        return;
      }
      setProblem("That code doesn't match. Check it with the research team.");
    } catch {
      setProblem("Couldn't reach Offshift. Check the connection and try again.");
    }
    setBusy(false);
  }

  return (
    <main className="access">
      <form className="access-card" onSubmit={submit} noValidate>
        <div className="eyebrow">Offshift</div>
        <h1>Enter the access code</h1>
        <p className="quiet">The research team will give you the code. This browser remembers it.</p>
        <div className="field">
          <label htmlFor="access-code">Access code</label>
          <input id="access-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus />
        </div>
        {problem && (
          <p className="form-problem" role="alert">
            {problem}
          </p>
        )}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Checking…" : "Open Offshift"}
        </button>
      </form>
    </main>
  );
}
