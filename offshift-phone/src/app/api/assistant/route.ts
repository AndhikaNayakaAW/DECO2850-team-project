import Anthropic from "@anthropic-ai/sdk";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { ANNOUNCE, BRIEF, assistantContext, scriptedTurn, type AssistantAction } from "@/lib/assistant";
import { DAYS } from "@/lib/logic";
import type { DataSlice } from "@/lib/store";
import type { Day, Decision } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-5";

const SYSTEM = `You are the voice of Offshift, a care-centred app for Dinda (she/her), a university student in Brisbane who works casual shifts at Pandora and McDonald's. Everything you say is read aloud, so write for the ear: two to four short sentences, plain words, no lists, no markdown, no headings, no emoji. Warm, calm, lightly dry, like a good butler. Never salesy, never pushy.

Greet her by the time of day from the clock in the context (Good morning, Good afternoon, Good evening) and address her as Dinda.

Care rules: the decision is always hers. Either answer to an ask is fine, and you never lean on her to take a shift or to rest. Nothing about her body, mood or money ever goes to an employer. Do not invent events, names or numbers; use only the context.

When she asks for the briefing, say: the greeting, what is on today in order, any waiting ask with who is asking and when, the one or two trade-offs Offshift flagged (Body, Week, Money), roughly what it pays, and then ask what she would like to do with it.

When a new ask is announced, say who is asking and when, the main trade-off, and ask what she would like to do.

When she decides on an ask (take it, another time, a swap, not tonight, later), call respond_to_ask with the matching decision, then confirm in one or two short sentences what happens next. When she asks to add a plan, call add_plan. When she asks about a day, call show_day and describe that day in a sentence. If she asks something outside Offshift, answer in one sentence and come back to the week.`;

const tools: Anthropic.Tool[] = [
  {
    name: "respond_to_ask",
    description: "Answer a pending shift ask on Dinda's behalf. Offshift sends the message to the manager through the employer app.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        offer_id: { type: "string", description: "The id of the pending ask from the context." },
        decision: {
          type: "string",
          enum: ["accept", "negotiate", "swap", "decline", "later"],
          description: "accept = take it; negotiate = offer another time; swap = ask a colleague to take it; decline = say no; later = set a reminder and send nothing.",
        },
      },
      required: ["offer_id", "decision"],
      additionalProperties: false,
    },
  },
  {
    name: "add_plan",
    description: "Add a personal plan to Dinda's calendar.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        day: { type: "string", enum: [...DAYS] },
        start: { type: "string", description: "24-hour time, HH:MM" },
        end: { type: "string", description: "24-hour time, HH:MM" },
      },
      required: ["title", "day", "start", "end"],
      additionalProperties: false,
    },
  },
  {
    name: "show_day",
    description: "Bring a day of the week into view on the calendar.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { day: { type: "string", enum: [...DAYS] } },
      required: ["day"],
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

function toAction(name: string, input: unknown): AssistantAction | null {
  const i = input as Record<string, string>;
  if (name === "respond_to_ask") return { type: "respond", offerId: i.offer_id, decision: i.decision as Decision };
  if (name === "add_plan") return { type: "add_plan", title: i.title, day: i.day as Day, start: i.start, end: i.end };
  if (name === "show_day") return { type: "show_day", day: i.day as Day };
  return null;
}

function userText(input: string, state: DataSlice): string {
  if (input === BRIEF) return "Brief me on my day.";
  if (input.startsWith(ANNOUNCE)) {
    const o = state.offers.find((x) => x.id === input.slice(ANNOUNCE.length));
    return o ? `A new ask just arrived from ${o.from} (id ${o.id}). Announce it to me.` : "Anything new?";
  }
  return input;
}

export async function POST(req: Request) {
  const body = (await req.json()) as { input: string; history?: Anthropic.MessageParam[]; state: DataSlice };
  const { input, state } = body;
  const history = Array.isArray(body.history) ? body.history : [];

  if (!hasCredentials()) {
    const r = scriptedTurn(input, state);
    return Response.json({ ...r, history, scripted: true });
  }

  const client = new Anthropic();
  const context = assistantContext(state);
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
    const r = scriptedTurn(input, state);
    return Response.json({ ...r, history, scripted: true, error: message });
  }
}
