import { afterEach, describe, expect, it } from "vitest";
import { createSpendCap, ModelSpendCapExceededError, spendCapUsdFromEnv } from "../src/spend-cap";

describe("createSpendCap", () => {
  it("accumulates spend under the cap", () => {
    const cap = createSpendCap(10);
    cap.record(3);
    cap.record(4);
    expect(cap.spentUsd).toBe(7);
  });

  it("allows a call that lands exactly on the cap", () => {
    const cap = createSpendCap(10);
    cap.record(10);
    expect(cap.spentUsd).toBe(10);
  });

  it("throws instead of recording a call that would exceed the cap", () => {
    const cap = createSpendCap(10);
    cap.record(8);
    expect(() => cap.record(3)).toThrow(ModelSpendCapExceededError);
    expect(cap.spentUsd).toBe(8);
  });

  it("canAfford reports affordability without recording anything", () => {
    const cap = createSpendCap(10);
    cap.record(8);
    expect(cap.canAfford(2)).toBe(true);
    expect(cap.canAfford(3)).toBe(false);
    expect(cap.spentUsd).toBe(8); // checking never mutates the running total
  });
});

describe("spendCapUsdFromEnv", () => {
  const originalEnv = process.env.LLM_SPEND_CAP_USD;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.LLM_SPEND_CAP_USD;
    else process.env.LLM_SPEND_CAP_USD = originalEnv;
  });

  it("reads a valid value from the environment", () => {
    process.env.LLM_SPEND_CAP_USD = "25";
    expect(spendCapUsdFromEnv()).toBe(25);
  });

  it("falls back to the PRD's $50 default when unset or invalid", () => {
    delete process.env.LLM_SPEND_CAP_USD;
    expect(spendCapUsdFromEnv()).toBe(50);
    process.env.LLM_SPEND_CAP_USD = "not-a-number";
    expect(spendCapUsdFromEnv()).toBe(50);
  });
});
