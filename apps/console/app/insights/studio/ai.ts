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

/** Suggestions shown under the Ask bar and in an empty chat. Each names the data's own fields
 *  plainly, so the model maps it correctly (asked for "paid on time", a cheap model once summed
 *  every payout, paused ones included; asked for payees "counted by outcome", it went looking for
 *  a payee id). Each uses fields whose ids are the plain words (kept, leaked, amount, outcome,
 *  group): the cheap model guesses ids from names and missed `caughtBy` and `atStake`. All three are
 *  column or bar charts, which it builds reliably; a donut and a line chart sent it round in
 *  circles, and so did asking it to also show the chart's title (or running it at temperature 0). */
export const promptStarters: AgAiPromptStarter[] = [
  { label: "Kept vs leaked, by run", prompt: "Add a column chart of the money kept from fraud and the money leaked to fraud in each payout run." },
  { label: "Money kept, by group", prompt: "Add a column chart of the money kept from fraud for each group." },
  { label: "Average payout by outcome", prompt: "Add a bar chart of the average payout amount for each outcome." },
];
