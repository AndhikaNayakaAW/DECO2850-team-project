import { askProblem, type AskInput } from "./actions";
import { addDays, type Now } from "./time";
import type { DateKey } from "./types";

/** Never open the test form with a shift that already started. */
export function defaultTestOffer(selected: DateKey, now: Pick<Now, "date">): AskInput {
  return { from: "Test manager", workplace: "Test workplace", date: selected > now.date ? selected : addDays(now.date, 1), start: "16:00", end: "21:00", note: "This is a test offer. Can you cover this shift?" };
}

const UNCERTAIN = "Could not confirm delivery. Check the calendar before retrying.";

/** Use the shared server, so success means saved for both the calendar and watch. No automatic retries. */
export async function submitTestOffer(input: AskInput, now: Pick<Now, "date" | "time">, request: typeof fetch = fetch): Promise<void> {
  const problem = askProblem(input, now);
  if (problem) throw new Error(problem);
  let response: Response;
  try {
    response = await request("/api/team", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-ask", ask: input }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // The server may have saved before the connection was lost. Don't risk sending a second offer.
    throw new Error(UNCERTAIN);
  }
  if (response.status === 401 || response.status === 403) throw new Error("Your access has expired. Reload and enter the access code, then try again.");
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(UNCERTAIN);
  }
  if (!response.ok) throw new Error(response.status < 500 && typeof result?.error === "string" ? result.error : UNCERTAIN);
  const acknowledged = typeof result?.version === "number" && Array.isArray(result?.asks) && result.asks.some((ask: Record<string, unknown> | null) =>
    ask && typeof ask.id === "string" && ask.status === "pending" && ask.from === input.from.trim() && ask.workplace === input.workplace.trim() && ask.date === input.date && ask.start === input.start && ask.end === input.end,
  );
  if (!acknowledged) throw new Error(UNCERTAIN);
}
