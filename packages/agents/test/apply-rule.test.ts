import type { PayoutItem, PayoutRun } from "@ringfence/engine";
import { describe, expect, it } from "vitest";
import { applyRule } from "../src/apply-rule";
import { investigate } from "../src/investigate";
import type { ProposedRule, RuleCondition } from "../src/types";

function item(id: string, overrides: Partial<PayoutItem["context"]> = {}): PayoutItem {
  return {
    recipient_type: "EMAIL",
    receiver: `${id}@gmail.com`,
    amount: { value: "20.00", currency: "USD" },
    sender_item_id: `ref_${id}`,
    context: {
      account_id: `u_${id}`,
      signup_at: "2026-11-01T10:00:00Z",
      device_hash: `d_${id}`,
      ip_prefix: "10.0.0.0/24",
      ...overrides,
    },
  };
}

function rule(conditions: RuleCondition[]): ProposedRule {
  return { id: "t", action: "HOLD", when: { all: conditions }, source: "test" };
}

function run(items: PayoutItem[]): PayoutRun {
  return { sender_batch_header: { sender_batch_id: "t" }, items };
}

describe("applyRule", () => {
  describe("signup_burst", () => {
    const condition: RuleCondition = { signal: "signup_burst", same: "referrer", window_min: 5, min_accounts: 3 };

    it("matches a group of min_accounts or more sharing a referrer within the window", () => {
      const items = [
        item("a", { referrer_id: "r1", signup_at: "2026-11-01T10:00:00Z" }),
        item("b", { referrer_id: "r1", signup_at: "2026-11-01T10:01:00Z" }),
        item("c", { referrer_id: "r1", signup_at: "2026-11-01T10:02:00Z" }),
        item("d", { referrer_id: "r1", signup_at: "2026-11-01T10:15:00Z" }),
      ];
      const matches = applyRule(rule([condition]), run(items));
      expect(matches.sort()).toEqual(["ref_a", "ref_b", "ref_c"]);
    });

    it("doesn't match a referrer group that never reaches min_accounts inside the window", () => {
      const items = [
        item("a", { referrer_id: "r1", signup_at: "2026-11-01T10:00:00Z" }),
        item("b", { referrer_id: "r1", signup_at: "2026-11-01T10:01:00Z" }),
      ];
      expect(applyRule(rule([condition]), run(items))).toEqual([]);
    });

    it("excludes items with no referrer_id, even when their timing would otherwise cluster", () => {
      const items = [
        item("a", { referrer_id: "r1", signup_at: "2026-11-01T10:00:00Z" }),
        item("b", { referrer_id: "r1", signup_at: "2026-11-01T10:01:00Z" }),
        item("c", { signup_at: "2026-11-01T10:02:00Z" }), // no referrer_id at all
      ];
      // Only 2 referred accounts exist, short of min_accounts: 3, so neither matches.
      expect(applyRule(rule([condition]), run(items))).toEqual([]);
    });
  });

  describe("onboarding_seconds", () => {
    const condition: RuleCondition = { signal: "onboarding_seconds", max: 100 };

    it("matches items at or under the cap and excludes items over it", () => {
      const items = [
        item("a", { onboarding_seconds: 100 }),
        item("b", { onboarding_seconds: 101 }),
      ];
      expect(applyRule(rule([condition]), run(items))).toEqual(["ref_a"]);
    });

    it("excludes an item with no onboarding_seconds recorded at all", () => {
      const items = [item("a")];
      expect(applyRule(rule([condition]), run(items))).toEqual([]);
    });
  });

  describe("activity_after_onboarding", () => {
    const condition: RuleCondition = { signal: "activity_after_onboarding", max: 0 };

    it("matches items at or under the cap and excludes items over it", () => {
      const items = [
        item("a", { activity_after_onboarding: 0 }),
        item("b", { activity_after_onboarding: 1 }),
      ];
      expect(applyRule(rule([condition]), run(items))).toEqual(["ref_a"]);
    });

    it("excludes an item with no activity_after_onboarding recorded at all", () => {
      const items = [item("a")];
      expect(applyRule(rule([condition]), run(items))).toEqual([]);
    });
  });

  it("requires every condition to pass at once, not just one of them", () => {
    const conditions: RuleCondition[] = [
      { signal: "onboarding_seconds", max: 100 },
      { signal: "activity_after_onboarding", max: 0 },
    ];
    const items = [
      item("a", { onboarding_seconds: 90, activity_after_onboarding: 0 }), // both pass
      item("b", { onboarding_seconds: 90, activity_after_onboarding: 5 }), // fails the second
      item("c", { onboarding_seconds: 200, activity_after_onboarding: 0 }), // fails the first
    ];
    expect(applyRule(rule(conditions), run(items))).toEqual(["ref_a"]);
  });

  it("treats an unrecognized signal as always-passing, so only the signals it knows still filter", () => {
    const conditions: RuleCondition[] = [
      { signal: "some_future_signal", max: 0 },
      { signal: "onboarding_seconds", max: 100 },
    ];
    const items = [item("a", { onboarding_seconds: 90 }), item("b", { onboarding_seconds: 200 })];
    expect(applyRule(rule(conditions), run(items))).toEqual(["ref_a"]);
  });

  it("agrees with investigate's own proposed rule about which items are the ring it came from", () => {
    const ringItems = [
      item("a", { onboarding_seconds: 90, activity_after_onboarding: 0, referrer_id: "u_ref" }),
      item("b", { onboarding_seconds: 100, activity_after_onboarding: 0, referrer_id: "u_ref" }),
      item("c", { onboarding_seconds: 80, activity_after_onboarding: 0, referrer_id: "u_ref" }),
    ];
    // A decoy that's honest on one axis (slower onboarding) and so shouldn't match the proposed rule.
    const decoy = item("d", { onboarding_seconds: 500, activity_after_onboarding: 0, referrer_id: "u_ref" });
    const theRun = run([...ringItems, decoy]);
    const ring = { ring_id: "R-01", member_sender_item_ids: ["ref_a", "ref_b", "ref_c"], size: 3, reasons: [], louvain_clusters: 1 };

    const { proposed_rule } = investigate(ring, theRun);
    expect(applyRule(proposed_rule, theRun).sort()).toEqual(["ref_a", "ref_b", "ref_c"]);
  });
});
