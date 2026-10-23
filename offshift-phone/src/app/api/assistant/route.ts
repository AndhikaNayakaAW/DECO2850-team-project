import Anthropic from "@anthropic-ai/sdk";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { ANNOUNCE, ANSWER, BRIEF, assistantContext, scriptedTurn, type AssistantAction } from "@/lib/assistant";
import { emptyData } from "@/lib/session";
import { isClock, isDateKey, nowIn } from "@/lib/time";
import type { DataSlice, Decision } from "@/lib/types";
import { cleanData } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-5";

const SYSTEM = `You are the voice of Offshift, a care-centred calendar for someone who juggles casual shifts with study and the rest of life. Everything you say is read aloud, so write for the ear: two to four short sentences, plain words, no lists, no markdown, no headings, no emoji. Warm, calm, lightly dry, like a good butler. Never salesy, never pushy. Speak to the worker as "you".

Greet by the time of day from the clock in the context (Good morning, Good afternoon, Good evening). If the context gives the worker's name, use it; if it doesn't, never invent one.

Care rules: the decision is always theirs. Either answer to an ask is fine, and you never lean on them to take a shift or to rest. Nothing about their body or mood ever goes to an employer. Do not invent events, names or numbers; use only the context.

Body readings come from their own Garmin watch, as words only (energy, sleep, stress, resting heart rate, breathing, pulse ox, recovery), and only while they share them. Say what the watch reads, plainly, as a fact. Never diagnose, never guess how they feel, and never say what a reading means they should do.

When asked for the briefing, say: the greeting, what is on today in order, any waiting ask with who is asking, where and when, the one or two trade-offs Offshift flagged (Body, Week), and then ask what they would like to do with it.

When a new ask is announced, say who is asking, where and when, the main trade-off, and ask what they would like to do.

An ask has three answers: accept (the shift goes on their week), decline (it comes off their week) and later (it stays on their week, see-through, until they press it). No message is ever sent to the manager. When they decide on an ask, call respond_to_ask with the matching decision. You never answer for them: for accept or decline the calendar opens the ask and they press the button themselves, so say it's open and which button to press. For later, say it stays on their week and nothing was sent. If they sound unsure, don't pick for them: say there's no rush and ask which they'd like. When asked to add a plan, call add_plan. When asked about a day, call show_day and describe that day in a sentence. Days are real dates: use the dates in the context's week. If asked something outside Offshift, answer in one sentence and come back to the week.`;

const tools: Anthropic.Tool[] = [
  {
    name: "respond_to_ask",
    description: "Open a pending shift ask on the worker's calendar so they can press Accept or Decline themselves. 'later' keeps it on the week, see-through, and changes nothing else. Nothing is ever sent to the manager.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        offer_id: { type: "string", description: "The id of the pending ask from the context." },
        decision: {
          type: "string",
          enum: ["accept", "decline", "later"],
          description: "accept = they want the shift; decline = they don't; later = keep it on the week to decide later.",
        },
      },
      required: ["offer_id", "decision"],
      additionalProperties: false,
    },
  },
  {
    name: "add_plan",
    description: "Add a personal plan to the worker's calendar on a date.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "The date, YYYY-MM-DD, from the context's week." },
        start: { type: "string", description: "24-hour time, HH:MM" },
        end: { type: "string", description: "24-hour time, HH:MM" },
      },
      required: ["title", "date", "start", "end"],
      additionalProperties: false,
    },
  },
  {
    name: "show_day",
    description: "Bring a date into view on the calendar.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { date: { type: "string", description: "The date, YYYY-MM-DD." } },
      required: ["date"],
      additionalProperties: false,
    },
  },
];

function hasCredentials(): boolean {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE) return true;
  try {
    return existsSync(path.join(homedir(), ".config", "anthropic"));
  } catch {
    return false;
  }
}

const DECISIONS: Decision[] = ["accept", "decline", "later"];

/** Only well-formed actions reach the calendar: real dates and times, a known decision, a short title. */
function toAction(name: string, input: unknown): AssistantAction | null {
  const i = (input ?? {}) as Record<string, unknown>;
  if (name === "respond_to_ask" && typeof i.offer_id === "string" && DECISIONS.includes(i.decision as Decision)) return { type: "respond", offerId: i.offer_id, decision: i.decision as Decision };
  if (name === "add_plan" && typeof i.title === "string" && i.title.trim() && i.title.length <= 80 && isDateKey(i.date) && isClock(i.start) && isClock(i.end)) {
    return { type: "add_plan", title: i.title.trim(), date: i.date, start: i.start, end: i.end };
  }
  if (name === "show_day" && isDateKey(i.date)) return { type: "show_day", date: i.date };
  return null;
}

/** The conversation so far, as the browser sent it back: only real turns, recent ones, and never a cut pair of tool call and result. */
function priorTurns(history: unknown): Anthropic.MessageParam[] {
  if (!Array.isArray(history)) return [];
  const turns = history.filter((m): m is Anthropic.MessageParam => !!m && typeof m === "object" && ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant"));
  let start = Math.max(0, turns.length - 20);
  while (start < turns.length && !(turns[start].role === "user" && typeof turns[start].content === "string")) start++;
  const recent = turns.slice(start);
  return JSON.stringify(recent).length > 60_000 ? [] : recent;
}

function userText(input: string, state: DataSlice): string {
  if (input === BRIEF) return "Brief me on my day.";
  if (input.startsWith(ANSWER)) {
    const [id, decision] = input.slice(ANSWER.length).split(":");
    const o = state.offers.find((x) => x.id === id);
    const words: Record<string, string> = { accept: "accept it", decline: "decline it", later: "decide later" };
    return o ? `For ${o.from}'s ask (id ${o.id}), I'd like to ${words[decision] ?? decision}.` : "Never mind.";
  }
  if (input.startsWith(ANNOUNCE)) {
    const o = state.offers.find((x) => x.id === input.slice(ANNOUNCE.length));
    return o ? `A new ask just arrived from ${o.from} (id ${o.id}). Announce it to me.` : "Anything new?";
  }
  return input;
}

export async function POST(req: Request) {
  let body: { input?: unknown; history?: unknown; state?: unknown };
  try {
    body = (await req.json()) ?? {};
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400 });
  }
  const input = String(body.input ?? "").slice(0, 1000);
  const state: DataSlice = cleanData(body.state) ?? emptyData();
  const now = nowIn(state.settings.timeZone);
  const history = priorTurns(body.history);

  if (!hasCredentials()) {
    const r = scriptedTurn(input, state, now);
    return Response.json({ ...r, history, scripted: true });
  }

  const client = new Anthropic();
  const context = assistantContext(state, now);
  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: userText(input, state) }];
  const actions: AssistantAction[] = [];
  const spoken: string[] = [];

  try {
    for (let i = 0; i < 4; i++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        output_config: { effort: "low" },
        system: [
          { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
          { type: "text", text: `Context as of ${context.clock}:\n${JSON.stringify(context)}` },
        ],
        tools,
        messages,
      });
      for (const block of response.content) if (block.type === "text" && block.text.trim()) spoken.push(block.text.trim());
      messages.push({ role: "assistant", content: response.content });
      if (response.stop_reason !== "tool_use") break;
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const action = toAction(block.name, block.input);
        if (action) actions.push(action);
        results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(action ? { ok: true } : { ok: false, error: "unknown tool" }) });
      }
      messages.push({ role: "user", content: results });
    }
    return Response.json({ text: spoken.join(" "), actions, history: messages, scripted: false, model: MODEL });
  } catch (error) {
    const message = error instanceof Anthropic.APIError ? `${error.status}: ${error.message}` : String(error);
    const r = scriptedTurn(input, state, now);
    return Response.json({ ...r, history, scripted: true, error: message });
  }
}
