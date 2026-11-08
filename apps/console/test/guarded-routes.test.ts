import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as ringWatch } from "../app/api/ring-watch/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("public API proxy guards", () => {
  it("rejects an arbitrary Ring Watch run before making an upstream request", async () => {
    vi.stubEnv("RINGFENCE_API_URL", "https://api.example.test");
    vi.stubEnv("RINGFENCE_MCP_KEY", "server-only-key");
    const fetch = vi.spyOn(globalThis, "fetch");

    const response = await ringWatch(new Request("https://console.test/api/ring-watch?run_id=attacker-run&ring_id=R-99"));

    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("caps survey screening calls for each server process", async () => {
    vi.stubEnv("SURVEY_APP_MAX_CALLS", "1");
    vi.stubEnv("RINGFENCE_API_URL", "https://api.example.test");
    vi.stubEnv("RINGFENCE_SURVEY_API_KEY", "server-only-key");
    vi.resetModules();
    const { POST } = await import("../app/api/survey-app/screen/route");
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ summary: { pay: 1, hold: 0, block: 0 } }), { status: 200 }));

    expect((await POST()).status).toBe(200);
    expect((await POST()).status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
