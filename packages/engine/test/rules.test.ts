import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { backtest, evaluateRules, normalizeEmail, validateRule, type PayoutRun, type Rule } from "../src";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), "utf8"));
const week = (n: number): { run: PayoutRun; ring: Set<string> } => ({
  run: fixture(`week${n}`),
  ring: new Set((fixture(`week${n}.truth`) as Array<{ sender_item_id: string; group: string }>).filter((t) => t.group === "ring").map((t) => t.sender_item_id)),
});

// The PRD's learned rule, as approved after the red team's fix.
const R07: Rule = {
  id: "R-07",
  action: "HOLD",
  when: { all: [
    { signal: "signup_burst", same: "referrer", window_min: 30, min_accounts: 5 },
    { signal: "onboarding_seconds", max: 120 },
    { signal: "activity_after_onboarding", max: 0 },
  ] },
};

describe("evaluateRules", () => {
  it("week 1 on starter rules: 387 paid, 25 held, and every decision lists its rules", () => {
    const { decisions } = evaluateRules(week(1).run);
    const held = decisions.filter((d) => d.decision === "HOLD");
    expect(decisions.filter((d) => d.decision === "PAY")).toHaveLength(387);
    expect(held).toHaveLength(25);
    expect(decisions.every((d) => d.rules.length > 0)).toBe(true);
    expect(held.every((d) => d.rules.includes("S-01") && d.reasons.length > 0)).toBe(true);
    expect(decisions.filter((d) => d.decision === "PAY").every((d) => d.rules.join() === "S-00")).toBe(true);
  });

  it("week 2: learned rule R-07 holds exactly the 18 disguised accounts the graph can't link", () => {
    const { run, ring } = week(2);
    expect(evaluateRules(run).decisions.filter((d) => d.decision !== "PAY")).toHaveLength(0);
    const { decisions } = evaluateRules(run, [R07]);
    const held = decisions.filter((d) => d.decision === "HOLD");
    expect(new Set(held.map((d) => d.sender_item_id))).toEqual(ring);
    expect(held.every((d) => d.rules.join() === "R-07" && d.hold_group_id === "rule:R-07" && d.ring_id === undefined)).toBe(true);
    expect(held[0]?.reasons).toEqual(["signup_burst", "onboarding_seconds", "activity_after_onboarding"]);
    expect(decisions.filter((d) => d.decision === "PAY")).toHaveLength(419);
  });

  it("blocks a confirmed ring's devices and payout addresses (S-02), and a rule never turns a hold into a pay", () => {
    const { run, ring } = week(1);
    const ringItems = run.items.filter((i) => ring.has(i.sender_item_id));
    const knownFraud = { devices: ringItems.map((i) => i.context.device_hash), payoutAddresses: [normalizeEmail(ringItems[0]!.receiver).email] };
    const { decisions } = evaluateRules(run, [], { knownFraud });
    const ringDecisions = decisions.filter((d) => ring.has(d.sender_item_id));
    expect(ringDecisions.every((d) => d.decision === "BLOCK" && d.rules.includes("S-02") && d.rules.includes("S-01"))).toBe(true);
    // The roommates stay held, not paid, alongside the blocks.
    expect(decisions.filter((d) => d.decision === "HOLD")).toHaveLength(2);
  });
});

describe("validateRule", () => {
  it("accepts R-07 and rejects PAY rules, unknown signals and empty conditions", () => {
    expect(validateRule(R07)).toEqual([]);
    expect(validateRule({ ...R07, action: "PAY" })).toContain("action must be HOLD or BLOCK, got PAY");
    expect(validateRule({ ...R07, when: { all: [{ signal: "similar_answers" }] } })).toContain('unknown signal "similar_answers"');
    expect(validateRule({ ...R07, when: { all: [] } })).toContain("when.all needs at least one condition");
  });
});

describe("backtest", () => {
  const past = [0, 1].map((n) => ({ run: week(n).run, fraud: week(n).ring }));

  it("R-07 over weeks 0 and 1: all 32 ring accounts, $640, no false holds", () => {
    expect(backtest(R07, past)).toEqual({ weeks: 2, caught: 32, usd: 640, false_holds: 0 });
  });

  it("updates when a condition changes: speed alone holds 30 real payees, adding the referrer burst clears them", () => {
    const speed = { signal: "onboarding_seconds", max: 120 };
    expect(backtest({ ...R07, when: { all: [speed] } }, past)).toEqual({ weeks: 2, caught: 32, usd: 640, false_holds: 30 });
    expect(backtest({ ...R07, when: { all: [R07.when.all[0]!, speed] } }, past)).toEqual({ weeks: 2, caught: 32, usd: 640, false_holds: 0 });
  });
});
