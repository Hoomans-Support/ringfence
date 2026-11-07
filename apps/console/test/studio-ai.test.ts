import type { AgLlmRequest } from "ag-studio";
import { describe, expect, it } from "vitest";
import { toChatMessages } from "../lib/studio-ai";

describe("toChatMessages", () => {
  it("turns AG Studio's turn into Chat Completions messages, one assistant turn per batch of tool calls", () => {
    const request = {
      instructions: "You build dashboards.",
      responseFormat: { type: "text" },
      input: [
        { id: "m1", kind: "input", type: "message", role: "user", status: "completed", content: [{ type: "text", text: "Add a KPI." }] },
        { id: "a1", kind: "output", type: "message", role: "assistant", status: "completed", content: [{ type: "text", text: "Looking.", annotations: [] }] },
        { id: "c1", kind: "output", type: "function_call", callId: "call_1", name: "view_page", arguments: "{}" },
        { id: "c2", kind: "output", type: "function_call", callId: "call_2", name: "view_schema", arguments: "" },
        { kind: "input", type: "function_call_output", callId: "call_1", output: "{\"ok\":true}", status: "completed" },
        { kind: "input", type: "function_call_output", callId: "call_2", output: "{\"fields\":[]}", status: "completed" },
        { id: "r1", kind: "output", type: "reasoning", summary: [] },
      ],
    } as unknown as AgLlmRequest;

    expect(toChatMessages(request)).toEqual([
      { role: "system", content: "You build dashboards." },
      { role: "user", content: "Add a KPI." },
      {
        role: "assistant",
        content: "Looking.",
        tool_calls: [
          { id: "call_1", type: "function", function: { name: "view_page", arguments: "{}" } },
          { id: "call_2", type: "function", function: { name: "view_schema", arguments: "{}" } },
        ],
      },
      { role: "tool", tool_call_id: "call_1", content: "{\"ok\":true}" },
      { role: "tool", tool_call_id: "call_2", content: "{\"fields\":[]}" },
    ]);
  });
});
