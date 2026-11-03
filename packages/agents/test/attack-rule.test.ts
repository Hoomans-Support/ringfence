import { describe, expect, it } from "vitest";
import { attackRule, redTeamRule } from "../src/attack-rule";
import type { ProposedRule } from "../src/types";

const baseRule: ProposedRule = {
  id: "R-01",
  action: "HOLD",
  when: {
    all: [
      { signal: "signup_burst", same: "referrer", window_min: 9, min_accounts: 3 },
      { signal: "onboarding_seconds", max: 100 },
      { signal: "activity_after_onboarding", max: 0 },
    ],
  },
  source: "ring R-01",
};

describe("attackRule", () => {
  it("generates 200 variants with 50 held out", () => {
    const result = attackRule(baseRule);
    expect(result.variants).toBe(200);
    expect(result.held_out).toBe(50);
    expect(result.held_out_caught).toBeLessThanOrEqual(result.held_out);
    expect(result.caught).toBeGreaterThanOrEqual(result.held_out_caught);
    expect(result.caught).toBeLessThanOrEqual(result.variants);
    expect(result.misses.length).toBe(result.variants - result.caught);
  });

  it("is deterministic for the same rule id, so Reset demo reproduces the same score", () => {
    const first = attackRule(baseRule);
    const second = attackRule(baseRule);
    expect(second).toEqual(first);
  });

  it("scores a different rule id differently (distinct seed)", () => {
    const other: ProposedRule = { ...baseRule, id: "R-02" };
    expect(attackRule(other)).not.toEqual(attackRule(baseRule));
  });

  it("catches at least as many variants once a condition is dropped (same seed, strictly looser AND)", () => {
    // Thresholds here aren't absolute — attackRule treats a condition's own max/window as the
    // original ring's observed value, so a variant's raw stats scale with it too (a "looser"
    // number isn't actually looser, relative to itself). What genuinely loosens the rule is
    // dropping a clause: same id means same seed means identical raw draws, so removing one AND
    // clause can only turn some misses into catches, never the reverse.
    const withoutActivity: ProposedRule = {
      ...baseRule,
      when: { all: baseRule.when.all.filter((c) => c.signal !== "activity_after_onboarding") },
    };
    const full = attackRule(baseRule);
    const relaxed = attackRule(withoutActivity);
    expect(relaxed.caught).toBeGreaterThanOrEqual(full.caught);
  });

  it("lets some disguised copies slip through when thresholds sit exactly at the original ring's values", () => {
    const result = attackRule(baseRule);
    expect(result.caught).toBeLessThan(200);
    expect(result.misses.length).toBeGreaterThan(0);
  });

  it("catches everything for a rule with no conditions (vacuously true)", () => {
    const empty: ProposedRule = { ...baseRule, when: { all: [] } };
    const result = attackRule(empty);
    expect(result.caught).toBe(200);
  });

  it("redTeamRule attaches the red_team result to the rule without mutating the input", () => {
    const scored = redTeamRule(baseRule);
    expect(baseRule.red_team).toBeUndefined();
    expect(scored.red_team?.variants).toBe(200);
    expect(scored.id).toBe(baseRule.id);
  });
});
