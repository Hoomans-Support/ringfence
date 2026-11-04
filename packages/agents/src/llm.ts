/**
 * Minimal Gemini text-generation client — the one real model call in this codebase (see narrate.ts
 * for where it's used). A single REST call, no SDK dependency, matching the zero-dependency style
 * already used for service/server.mjs. Swappable for Groq or another provider later: callers never
 * touch this module directly, they go through narrate.ts's injectable `generate` option.
 */

const DEFAULT_MODEL = "gemini-2.5-flash";

export class LlmCallError extends Error {}

export interface GenerateTextOptions {
  apiKey?: string;
  model?: string;
  maxOutputTokens?: number;
  /** Set to "application/json" to make Gemini return raw JSON, no markdown code fences. */
  responseMimeType?: string;
  /** Gemini 2.x "thinking" models spend part of maxOutputTokens on hidden reasoning unless this is
   *  capped. 0 disables it on Flash models - there's no reasoning worth paying for on a one-line
   *  rewrite task, and leaving it unset risks the visible answer being truncated to nothing. */
  thinkingBudget?: number;
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LlmCallError("No GEMINI_API_KEY set");
  const model = options.model ?? process.env.LLM_MODEL ?? DEFAULT_MODEL;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: options.maxOutputTokens ?? 120,
          temperature: 0.4,
          ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
          ...(options.thinkingBudget !== undefined ? { thinkingConfig: { thinkingBudget: options.thinkingBudget } } : {}),
        },
      }),
    },
  );

  if (!res.ok) throw new LlmCallError(`Gemini API error: ${res.status} ${res.statusText}`);

  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new LlmCallError("Gemini response had no text");
  return text;
}
