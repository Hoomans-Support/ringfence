import { describe, expect, it } from "vitest";
import { closeCaughtCases, recordOpenCases } from "../src/red-team-cases";
import type { DisguiseAttempt, ProposedRule, RedTeamCase } from "../src/types";

const rule: ProposedRule = {
  id: "R-01",
  action: "HOLD",
  when: {
    all: [
      { signal: "signup_burst", same: "referrer", window_min: 10, min_accounts: 3 },
      { signal: "onboarding_seconds", max: 100 },
      { signal: "activity_after_onboarding", max: 0 },
    ],
  },
  source: "ring R-01",
};

/** Defaults to exactly the rule's own thresholds — i.e. a disguise that didn't push past the
 *  baseline on any axis, so it's caught unless an override pushes one over. */
function attempt(id: string, overrides: Partial<DisguiseAttempt> = {}): DisguiseAttempt {
  return {
    id,
    held_out: false,
    same_referrer: true,
    signup_spread_minutes: 10,
    onboarding_seconds: 100,
    activity_after_onboarding: 0,
    ...overrides,
  };
}

describe("recordOpenCases", () => {
  it("turns a rule's open_misses into new open cases, with the signals they actually beat", () => {
    const windowMiss = attempt("R-01-v5", { signup_spread_minutes: 15 });
    const referrerMiss = attempt("R-01-v9", { same_referrer: false });
    const scored: ProposedRule = {
      ...rule,
      red_team: { variants: 200, caught: 198, held_out: 50, held_out_caught: 50, misses: [], open_misses: [windowMiss, referrerMiss] },
    };

    const cases = recordOpenCases([], scored);

    expect(cases).toHaveLength(2);
    expect(cases[0]).toEqual({
      id: "R-01-v5",
      missedByRuleId: "R-01",
      attempt: windowMiss,
      failedSignals: ["signup_burst:window"],
      status: "open",
    });
    expect(cases[1]).toEqual({
      id: "R-01-v9",
      missedByRuleId: "R-01",
      attempt: referrerMiss,
      failedSignals: ["signup_burst:referrer"],
      status: "open",
    });
  });

  it("appends after whatever priorCases already held, leaving them untouched", () => {
    const existing: RedTeamCase = {
      id: "R-01-v1",
      missedByRuleId: "R-01",
      attempt: attempt("R-01-v1"),
      failedSignals: ["onboarding_seconds"],
      status: "closed",
      closedByRuleId: "R-01-v2",
    };
    const scored: ProposedRule = {
      ...rule,
      red_team: { variants: 200, caught: 199, held_out: 50, held_out_caught: 50, misses: [], open_misses: [attempt("R-01-v7", { onboarding_seconds: 150 })] },
    };

    const cases = recordOpenCases([existing], scored);

    expect(cases).toHaveLength(2);
    expect(cases[0]).toBe(existing);
    expect(cases[1]!.id).toBe("R-01-v7");
  });

  it("doesn't save the same attempt id twice", () => {
    const miss = attempt("R-01-v3", { onboarding_seconds: 150 });
    const scored: ProposedRule = {
      ...rule,
      red_team: { variants: 200, caught: 199, held_out: 50, held_out_caught: 50, misses: [], open_misses: [miss] },
    };

    const once = recordOpenCases([], scored);
    const twice = recordOpenCases(once, scored);

    expect(twice).toHaveLength(1);
  });

  it("is a no-op when the rule has no red_team result yet", () => {
    const priorCases = [
      { id: "x", missedByRuleId: "R-01", attempt: attempt("x"), failedSignals: [], status: "open" as const },
    ];
    expect(recordOpenCases(priorCases, rule)).toEqual(priorCases);
  });
});

describe("closeCaughtCases", () => {
  function openCase(id: string, a: DisguiseAttempt, failedSignals: string[]): RedTeamCase {
    return { id, missedByRuleId: "R-01", attempt: a, failedSignals, status: "open" };
  }

  it("closes a case once a revised rule's widened threshold actually covers its saved attempt", () => {
    const missedActivity = attempt("R-01-v4", { activity_after_onboarding: 2 });
    const cases = [openCase("R-01-v4", missedActivity, ["activity_after_onboarding"])];

    // A genuine widen — not a dropped clause — now closes it, because the attempt carries a real
    // simulated value (2 actions) a wider cap can actually cover, not a pre-baked pass/fail boolean.
    const revised: ProposedRule = {
      ...rule,
      id: "R-01-v2",
      when: { all: rule.when.all.map((c) => (c.signal === "activity_after_onboarding" ? { ...c, max: 3 } : c)) },
    };

    const result = closeCaughtCases(cases, revised);

    expect(result[0]!.status).toBe("closed");
    expect(result[0]!.closedByRuleId).toBe("R-01-v2");
  });

  it("leaves a case open when the revised rule still fails to catch its saved attempt", () => {
    const stillMisses = attempt("R-01-v6", { same_referrer: false });
    const cases = [openCase("R-01-v6", stillMisses, ["signup_burst:referrer"])];

    // Referrer is categorical — no numeric widen closes it, so even a rule that widens every other
    // axis should leave this case open exactly as the spec expects.
    const revised: ProposedRule = {
      ...rule,
      id: "R-01-v2",
      when: { all: [{ ...rule.when.all[0]!, window_min: 20 }, ...rule.when.all.slice(1)] },
    };

    const result = closeCaughtCases(cases, revised);

    expect(result[0]!.status).toBe("open");
    expect(result[0]!.closedByRuleId).toBeUndefined();
  });

  it("leaves a case open when the widen doesn't cover how far its attempt actually pushed", () => {
    const farMiss = attempt("R-01-v8", { onboarding_seconds: 500 });
    const cases = [openCase("R-01-v8", farMiss, ["onboarding_seconds"])];

    const revised: ProposedRule = {
      ...rule,
      id: "R-01-v2",
      when: { all: rule.when.all.map((c) => (c.signal === "onboarding_seconds" ? { ...c, max: 150 } : c)) },
    };

    const result = closeCaughtCases(cases, revised);

    expect(result[0]!.status).toBe("open");
  });

  it("never reopens or relabels an already-closed case", () => {
    const closed: RedTeamCase = {
      id: "R-01-v2",
      missedByRuleId: "R-01",
      attempt: attempt("R-01-v2"),
      failedSignals: ["onboarding_seconds"],
      status: "closed",
      closedByRuleId: "R-01-v2",
    };

    const result = closeCaughtCases([closed], { ...rule, id: "R-01-v3", when: { all: [] } });

    expect(result[0]).toBe(closed);
  });

  it("doesn't mutate the input array or its cases", () => {
    const miss = attempt("R-01-v4", { activity_after_onboarding: 2 });
    const cases = [openCase("R-01-v4", miss, ["activity_after_onboarding"])];
    const revised: ProposedRule = { ...rule, id: "R-01-v2", when: { all: [] } };

    closeCaughtCases(cases, revised);

    expect(cases[0]!.status).toBe("open");
  });
});
