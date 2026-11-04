import { afterEach, describe, expect, it, vi } from "vitest";
import { generateText, hasGeminiKey, LlmCallError } from "../src/llm";

describe("hasGeminiKey", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  afterEach(() => {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it("is false when GEMINI_API_KEY is unset", () => {
    delete process.env.GEMINI_API_KEY;
    expect(hasGeminiKey()).toBe(false);
  });

  it("is true once GEMINI_API_KEY is set", () => {
    process.env.GEMINI_API_KEY = "test-key";
    expect(hasGeminiKey()).toBe(true);
  });
});

describe("generateText", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("throws without calling the network when no API key is available", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    await expect(generateText("prompt", { apiKey: undefined })).rejects.toThrow(LlmCallError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts the prompt to the given model's endpoint and returns the trimmed text", async () => {
    const fetchSpy = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toContain("models/gemini-test-model:generateContent");
      expect(url).toContain("key=the-key");
      const body = JSON.parse(init.body as string);
      expect(body.contents[0].parts[0].text).toBe("hello");
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ candidates: [{ content: { parts: [{ text: "  a short sentence  " }] } }] }),
      } as Response;
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const text = await generateText("hello", { apiKey: "the-key", model: "gemini-test-model" });
    expect(text).toBe("a short sentence");
  });

  it("includes responseMimeType in generationConfig when given", async () => {
    const fetchSpy = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body.generationConfig.responseMimeType).toBe("application/json");
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }) } as Response;
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await generateText("hello", { apiKey: "the-key", responseMimeType: "application/json" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("omits responseMimeType from generationConfig when not given", async () => {
    const fetchSpy = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body.generationConfig.responseMimeType).toBeUndefined();
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }) } as Response;
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await generateText("hello", { apiKey: "the-key" });
  });

  it("includes thinkingConfig.thinkingBudget when given, including zero", async () => {
    const fetchSpy = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }) } as Response;
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await generateText("hello", { apiKey: "the-key", thinkingBudget: 0 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws LlmCallError on a non-OK response", async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 429, statusText: "Too Many Requests" }) as Response) as unknown as typeof fetch;
    await expect(generateText("hello", { apiKey: "the-key" })).rejects.toThrow(LlmCallError);
  });

  it("throws LlmCallError when the response has no text", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => ({ candidates: [] }) }) as Response) as unknown as typeof fetch;
    await expect(generateText("hello", { apiKey: "the-key" })).rejects.toThrow(LlmCallError);
  });
});
