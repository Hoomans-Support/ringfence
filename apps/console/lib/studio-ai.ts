// AG Studio's AI conversation (Responses-style items: messages, function calls, their outputs)
// translated to OpenAI-compatible Chat Completions messages, for app/api/studio-ai/route.ts.
import type { AgLlmRequest } from "ag-studio";

export interface StudioAiModel { model: string; endpoint: string; key: string; gemini: boolean }

/** The models the assistant may use, in the order it tries them; empty when none is configured (the
 *  assistant is then hidden). All speak OpenAI-compatible Chat Completions. Gemini's free tier comes
 *  first, in models with separate daily quotas (a free key gets only a few dozen requests a day per
 *  model, and one question takes 10 or so), then OpenRouter as the paid fallback. */
export function studioAiModels(): StudioAiModel[] {
  const models: StudioAiModel[] = [];
  const gemini = process.env.GEMINI_API_KEY;
  if (gemini) {
    for (const model of (process.env.STUDIO_AI_GEMINI_MODELS ?? "gemini-3.1-flash-lite,gemini-3-flash-preview").split(",")) {
      models.push({ model: model.trim(), endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: gemini, gemini: true });
    }
  }
  const openrouter = process.env.OPENROUTER_API_KEY;
  if (openrouter) models.push({ model: process.env.OPENROUTER_MODEL ?? "openai/gpt-oss-120b", endpoint: "https://openrouter.ai/api/v1/chat/completions", key: openrouter, gemini: false });
  return models;
}

/** How long a rate-limited model asks to be left alone ("Please retry in 19m17.12s."), else a minute. */
export function retryMs(message = ""): number {
  const m = /retry in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i.exec(message);
  return m ? ((Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) * 60 + Number(m[3])) * 1000 : 60_000;
}

/** Gemini 3 wants each earlier tool call's thought signature sent back, and AG Studio doesn't keep
 *  them, so every call gets the placeholder Google documents for calls it didn't make itself. */
export function withThoughtSignatures(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => (m.role === "assistant" && m.tool_calls
    ? { ...m, tool_calls: m.tool_calls.map((c) => ({ ...c, extra_content: { google: { thought_signature: "skip_thought_signature_validator" } } })) }
    : m));
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string }; extra_content?: unknown }[] }
  | { role: "tool"; tool_call_id: string; content: string };

const textOf = (content: { type: string; text?: string }[]) => content.map((c) => c.text ?? "").filter(Boolean).join("\n");

/** AG Studio's conversation (Responses-style items) as Chat Completions messages. */
export function toChatMessages(request: AgLlmRequest): ChatMessage[] {
  const messages: ChatMessage[] = request.instructions ? [{ role: "system", content: request.instructions }] : [];
  for (const item of request.input) {
    if (item.type === "message") {
      if (item.role === "assistant") messages.push({ role: "assistant", content: textOf(item.content) });
      else messages.push({ role: item.role, content: textOf(item.content) });
    } else if (item.type === "function_call") {
      // Consecutive calls (and any text just before them) belong to one assistant turn.
      const last = messages.at(-1);
      const call = { id: item.callId, type: "function" as const, function: { name: item.name, arguments: item.arguments || "{}" } };
      if (last?.role === "assistant") last.tool_calls = [...(last.tool_calls ?? []), call];
      else messages.push({ role: "assistant", content: null, tool_calls: [call] });
    } else if (item.type === "function_call_output") {
      messages.push({ role: "tool", tool_call_id: item.callId, content: item.output });
    }
    // Reasoning items stay with the model that produced them; they aren't replayed.
  }
  return messages;
}
