// The control tower's AG Studio AI assistant, server side. AG Studio ships the chat panel and its
// agents but no model connection (its docs: "AG Studio ships no adapters"), and recommends keeping
// the provider key off the browser. So the browser adapter (control-tower/studio/ai.ts) posts AG
// Studio's request here; this translates it to OpenRouter's OpenAI-compatible Chat Completions
// (messages, tool calls, tool results, structured output), calls the model with the server-side
// key, and translates the reply back into AG Studio's response shape.
import type { AgLlmRequest, AgLlmResponse } from "ag-studio";
import { toChatMessages } from "@/lib/studio-ai";

export const runtime = "nodejs";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
// The console is public: cap each reply and the calls one server process will make, so a visitor
// can't run up the bill. ponytail: per-process counter, resets on restart; a real deployment would
// meter per user.
const MAX_TOKENS = 4096;
const MAX_CALLS = Number(process.env.STUDIO_AI_MAX_CALLS ?? 400);
let calls = 0;

const failed = (code: string, message: string): AgLlmResponse => ({ id: `err-${Date.now()}`, createdAt: Date.now(), status: "failed", output: [], error: { code, message } });

export async function POST(req: Request) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return Response.json(failed("not_configured", "The AI assistant isn't configured on this console."), { status: 503 });
  if (calls >= MAX_CALLS) return Response.json(failed("budget", "The AI assistant has used this server's call budget for now."), { status: 429 });
  calls++;

  const request = (await req.json()) as AgLlmRequest;
  // STUDIO_AI_DEBUG=1 logs each turn (tools offered, what they answered, what the model called): the
  // way to see why an agent is stuck. Off by default; it prints conversation content to the server log.
  if (process.env.STUDIO_AI_DEBUG) {
    const results = request.input.filter((i) => i.type === "function_call_output").slice(-3).map((i) => (i.type === "function_call_output" ? i.output.slice(0, 400) : ""));
    console.log("[studio-ai] tools:", request.tools?.map((t) => t.name).join(","), "| format:", request.responseFormat?.type, "| last results:", JSON.stringify(results));
  }
  const body: Record<string, unknown> = {
    model: process.env.OPENROUTER_MODEL ?? "openai/gpt-oss-120b",
    messages: toChatMessages(request),
    max_tokens: MAX_TOKENS,
  };
  if (request.tools?.length) {
    body.tools = request.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
    const choice = request.toolChoice;
    if (choice) body.tool_choice = typeof choice === "string" ? choice : { type: "function", function: { name: choice.name } };
  }
  if (request.responseFormat?.type === "json") {
    const f = request.responseFormat;
    body.response_format = { type: "json_schema", json_schema: { name: f.name, description: f.description, schema: f.schema, strict: false } };
  }

  const upstream = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Ringfence control tower" },
    body: JSON.stringify(body),
    signal: req.signal,
  }).catch((err: unknown) => err as Error);
  if (upstream instanceof Error) return Response.json(failed("network", upstream.message));
  const json = (await upstream.json().catch(() => ({}))) as {
    id?: string; model?: string; error?: { message?: string; code?: string | number };
    choices?: { finish_reason?: string; message?: { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  if (!upstream.ok || json.error || !json.choices?.[0]) {
    return Response.json(failed(String(json.error?.code ?? upstream.status), json.error?.message ?? `OpenRouter answered ${upstream.status}`));
  }

  const choice = json.choices[0];
  if (process.env.STUDIO_AI_DEBUG) console.log("[studio-ai] reply:", choice.finish_reason, (choice.message?.content ?? "").slice(0, 200).replace(/\n/g, " "), "| calls:", JSON.stringify((choice.message?.tool_calls ?? []).map((c) => `${c.function.name}(${c.function.arguments.slice(0, 300)})`)));
  const id = json.id ?? `or-${Date.now()}`;
  const output: AgLlmResponse["output"] = [];
  if (choice.message?.content) {
    output.push({ id: `${id}-msg`, kind: "output", type: "message", role: "assistant", status: "completed", content: [{ type: "text", text: choice.message.content, annotations: [] }] });
  }
  for (const tc of choice.message?.tool_calls ?? []) {
    output.push({ id: tc.id, kind: "output", type: "function_call", callId: tc.id, name: tc.function.name, arguments: tc.function.arguments || "{}", status: "completed" });
  }
  const response: AgLlmResponse = {
    id,
    createdAt: Date.now(),
    status: choice.finish_reason === "length" ? "incomplete" : "completed",
    output,
    model: json.model,
    usage: { inputTokens: json.usage?.prompt_tokens ?? 0, outputTokens: json.usage?.completion_tokens ?? 0, totalTokens: json.usage?.total_tokens },
  };
  return Response.json(response);
}
