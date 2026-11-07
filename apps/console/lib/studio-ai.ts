// AG Studio's AI conversation (Responses-style items: messages, function calls, their outputs)
// translated to OpenAI-compatible Chat Completions messages, for app/api/studio-ai/route.ts.
import type { AgLlmRequest } from "ag-studio";

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
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
