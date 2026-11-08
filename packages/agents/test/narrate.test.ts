import { maskEmail } from "@ringfence/engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSpendCap } from "../src/spend-cap";
import { narrateClaims, type ClaimTextGenerator } from "../src/narrate";
import type { CaseFile } from "../src/types";

function caseFile(): CaseFile {
  return {
    ring_id: "R-01",
    claims: [
      { id: "c1", text: "Accounts 1 and 2 used device d_ring.", check: { kind: "shared_device", account_ids: ["u_1", "u_2"], device_hash: "d_ring" }, checked: true },
      { id: "c2", text: "All 2 accounts signed up within 5 minutes of each other.", check: { kind: "signup_window", account_ids: ["u_1", "u_2"], window_minutes: 5 }, checked: true },
    ],
    proposed_rule: { id: "R-01", action: "HOLD", when: { all: [] }, source: "ring R-01" },
    claims_checked: { checked: 2, total: 2 },
  };
}

describe("narrateClaims", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  afterEach(() => {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it("makes no network call and leaves claims untouched when no generator and no API key are configured", async () => {
    delete process.env.GEMINI_API_KEY;
    const original = caseFile();
    const result = await narrateClaims(original);
    expect(result).toEqual(original);
  });

  it("makes exactly one generator call per case file, regardless of claim count", async () => {
    process.env.GEMINI_API_KEY = "unused-because-generate-is-injected";
    const generate = vi.fn(async () => ({ c1: "Two accounts shared one device.", c2: "Both signed up minutes apart." }));
    const original = caseFile();
    const result = await narrateClaims(original, { generate });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.claims[0]?.text).toBe("Two accounts shared one device.");
    expect(result.claims[1]?.text).toBe("Both signed up minutes apart.");
  });

  it("leaves every claim's check and checked flag untouched", async () => {
    const generate = vi.fn(async () => ({ c1: "rewritten", c2: "rewritten" }));
    const original = caseFile();
    const result = await narrateClaims(original, { generate });

    expect(result.claims[0]?.check).toEqual(original.claims[0]?.check);
    expect(result.claims[0]?.checked).toBe(true);
  });

  it("passes every claim's id and check, plus the ring's member count, to the generator", async () => {
    const generate = vi.fn(async () => ({}));
    await narrateClaims(caseFile(), { generate });

    expect(generate).toHaveBeenCalledWith(
      [
        { id: "c1", check: { kind: "shared_device", account_ids: ["u_1", "u_2"], device_hash: "d_ring" } },
        { id: "c2", check: { kind: "signup_window", account_ids: ["u_1", "u_2"], window_minutes: 5 } },
      ],
      2,
    );
  });

  it("keeps a claim's original scripted text when the generator's response omits its id", async () => {
    const generate = vi.fn(async () => ({ c1: "rewritten" })); // c2 missing
    const original = caseFile();
    const result = await narrateClaims(original, { generate });

    expect(result.claims[0]?.text).toBe("rewritten");
    expect(result.claims[1]?.text).toBe(original.claims[1]?.text);
  });

  it("falls back to every original scripted sentence when the generator throws", async () => {
    const generate = vi.fn(async () => {
      throw new Error("network down");
    });
    const original = caseFile();
    const result = await narrateClaims(original, { generate });

    expect(result).toEqual(original);
  });

  it("falls back without calling the generator once the spend cap is already exhausted", async () => {
    const spendCap = createSpendCap(0);
    const generate = vi.fn(async () => ({ c1: "should never be used" }));
    const original = caseFile();
    const result = await narrateClaims(original, { generate, spendCap });

    expect(generate).not.toHaveBeenCalled();
    expect(result).toEqual(original);
  });

  it("never charges the spend cap for a call that failed", async () => {
    const spendCap = createSpendCap(10);
    const generate = vi.fn(async () => {
      throw new Error("network down");
    });
    await narrateClaims(caseFile(), { generate, spendCap });

    expect(spendCap.spentUsd).toBe(0);
  });

  it("records exactly one call's cost per case file against a shared spend cap", async () => {
    const spendCap = createSpendCap(10);
    const generate = vi.fn(async () => ({ c1: "rewritten", c2: "rewritten" }));
    await narrateClaims(caseFile(), { generate, spendCap });
    const afterOne = spendCap.spentUsd;
    expect(afterOne).toBeGreaterThan(0);

    await narrateClaims(caseFile(), { generate, spendCap });
    expect(spendCap.spentUsd).toBeCloseTo(afterOne * 2, 6);
  });

  it("reserves a shared cap before concurrent case-file generators start", async () => {
    const spendCap = createSpendCap(0.001);
    const generate = vi.fn(async () => {
      await Promise.resolve();
      return { c1: "rewritten", c2: "rewritten" };
    });
    await Promise.all([narrateClaims(caseFile(), { generate, spendCap }), narrateClaims(caseFile(), { generate, spendCap })]);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(spendCap.spentUsd).toBe(0.001);
  });

  it("masks an alias_pattern claim's email-shaped alias_key before any generator sees it", async () => {
    const withAlias: CaseFile = {
      ...caseFile(),
      claims: [
        {
          id: "c3",
          text: "2 payout addresses follow the same pattern.",
          check: { kind: "alias_pattern", account_ids: ["u_1", "u_2"], alias_key: "budgetfriend@gmail.com" },
        },
      ],
    };
    const generate: ClaimTextGenerator = vi.fn(async () => ({}));
    await narrateClaims(withAlias, { generate });

    const sentCheck = vi.mocked(generate).mock.calls[0]?.[0]?.[0]?.check;
    expect(sentCheck?.alias_key).toBe(maskEmail("budgetfriend@gmail.com"));
    expect(sentCheck?.alias_key).not.toMatch(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  });

  it("is a no-op on a case file with no claims", async () => {
    const generate = vi.fn(async () => ({}));
    const empty: CaseFile = { ...caseFile(), claims: [] };
    const result = await narrateClaims(empty, { generate });

    expect(generate).not.toHaveBeenCalled();
    expect(result).toEqual(empty);
  });
});
