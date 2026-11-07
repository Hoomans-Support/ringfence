// The AG Studio AI assistant's model connection, browser side. AG Studio's agents hand each turn to
// this adapter; it posts the turn to our own server route (app/api/studio-ai), which holds the
// OpenRouter key, and replays the answer as AG Studio's text and tool-call events. The route
// answers in one piece, so the "stream" is that answer replayed, not token-by-token.
import type { AgAiEvent, AgAiPromptStarter, AgLlmAdapter, AgLlmResponse } from "ag-studio";

function* eventsFor(response: AgLlmResponse): Generator<AgAiEvent> {
  if (response.error) {
    yield { type: "RUN_ERROR", message: response.error.message, code: response.error.code };
    return;
  }
  for (const item of response.output) {
    if (item.type === "message") {
      const text = item.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      yield { type: "TEXT_MESSAGE_START", messageId: item.id, role: "assistant" };
      yield { type: "TEXT_MESSAGE_CONTENT", messageId: item.id, delta: text };
      yield { type: "TEXT_MESSAGE_END", messageId: item.id };
    } else if (item.type === "function_call") {
      yield { type: "TOOL_CALL_START", toolCallId: item.callId, toolCallName: item.name };
      yield { type: "TOOL_CALL_ARGS", toolCallId: item.callId, delta: item.arguments };
      yield { type: "TOOL_CALL_END", toolCallId: item.callId };
    }
  }
}

export const studioAiAdapter: AgLlmAdapter = {
  executeTurn(request, options) {
    const complete: Promise<AgLlmResponse> = fetch("/api/studio-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: options?.signal,
    })
      .then((res) => res.json() as Promise<AgLlmResponse>)
      .catch((err: unknown) => ({
        id: `err-${Date.now()}`, createdAt: Date.now(), status: "failed", output: [],
        error: { code: "network", message: err instanceof Error ? err.message : "The AI assistant couldn't be reached." },
      }));
    return {
      complete,
      stream: { async *[Symbol.asyncIterator]() { yield* eventsFor(await complete); } },
    };
  },
};

/** Suggestions shown in an empty chat: each names the data plainly, so the model maps it correctly
 *  (asked for "paid on time", a cheap model summed every payout, paused ones included). */
export const promptStarters: AgAiPromptStarter[] = [
  { label: "Paused by group", prompt: "Add a bar chart of the paused accounts, counted by group." },
  { label: "Payees by status", prompt: "Add a pie chart of this run's payees, counted by status." },
  { label: "Leaks by run", prompt: "Add a line chart of the money leaked to fraud in each payout run." },
];
