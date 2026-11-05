import { afterEach, describe, expect, it, vi } from "vitest";
import { summarizeForAnalyst } from "../src/ring-analyst";
import type { CaseFile } from "../src/types";

const caseFile: CaseFile = {
  ring_id: "R-12",
  claims_checked: { checked: 1, total: 1 },
  claims: [{ id: "alias", text: "Accounts use a similar address pattern.", checked: true, check: { kind: "alias_pattern", account_ids: ["a", "b"], alias_key: "payee123@gmail.com" } }],
  proposed_rule: { id: "R-07", action: "HOLD", when: { all: [] }, source: "test" },
};

afterEach(() => { vi.unstubAllEnvs(); });

describe("summarizeForAnalyst", () => {
  it("uses a scripted risk read when no Gemini key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const note = await summarizeForAnalyst(caseFile, { keptUsd: 80, leakedUsd: 0 });
    expect(note).toContain("Confirm the ring");
  });

  it("uses the fail-safe when the spend cap is hit", async () => {
    const generate = vi.fn(async () => "model text");
    const note = await summarizeForAnalyst(caseFile, { keptUsd: 80, leakedUsd: 0 }, { generate, spendCap: { spentUsd: 0, canAfford: () => false, record: vi.fn() } });
    expect(note).toContain("Confirm the ring");
    expect(generate).not.toHaveBeenCalled();
  });

  it("falls back after a generator error", async () => {
    const note = await summarizeForAnalyst(caseFile, { keptUsd: 80, leakedUsd: 0 }, { generate: async () => { throw new Error("offline"); } });
    expect(note).toContain("Confirm the ring");
  });

  it("masks alias_key before the injected generator sees it", async () => {
    let seen: CaseFile | undefined;
    await summarizeForAnalyst(caseFile, { keptUsd: 80, leakedUsd: 0 }, { generate: async (input) => { seen = input; return "Risk remains high; confirm the ring."; } });
    expect(seen?.claims[0]?.check.alias_key).not.toBe("payee123@gmail.com");
    expect(seen?.claims[0]?.check.alias_key).toMatch(/^payee_[a-f0-9]+$/);
  });
});
