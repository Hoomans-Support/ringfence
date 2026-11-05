import type { PayoutItem, PayoutRun } from "@ringfence/engine";
import { describe, expect, it } from "vitest";
import type { GroundTruthLabel } from "../lib/fixtures";
import { loadWeekRun, loadWeekTruth } from "../lib/fixtures";
import { buildR12Learning } from "../lib/learned-rule";

function item(id: string, overrides: Partial<PayoutItem["context"]> = {}): PayoutItem {
  return {
    recipient_type: "EMAIL",
    receiver: `${id}@gmail.com`,
    amount: { value: "20.00", currency: "USD" },
    sender_item_id: `ref_${id}`,
    context: { account_id: `u_${id}`, signup_at: "2026-11-01T10:00:00Z", device_hash: `d_${id}`, ip_prefix: "10.0.0.0/24", ...overrides },
  };
}

describe("buildR12Learning", () => {
  it("returns null when there's no ring overlapping the R-12 truth labels by at least 3 accounts", () => {
    const run: PayoutRun = {
      sender_batch_header: { sender_batch_id: "t" },
      items: [item("a"), item("b"), item("c")],
    };
    const truth: GroundTruthLabel[] = [
      { sender_item_id: "ref_a", account_id: "u_a", group: "honest" },
      { sender_item_id: "ref_b", account_id: "u_b", group: "honest" },
      { sender_item_id: "ref_c", account_id: "u_c", group: "honest" },
    ];
    expect(buildR12Learning(run, truth)).toBeNull();
  });

  // Week 1's real fixture and its R-12 ring are already exercised elsewhere (network.test.ts,
  // weeks.test.ts), so this reuses them rather than re-deriving a 23-member ring by hand. These
  // numbers come straight from the committed fixture, via the same seeded generator every other
  // week is built from, so they only move if that fixture is deliberately regenerated.
  describe("against Week 1's real R-12 ring", () => {
    const run = loadWeekRun(1);
    const truth = loadWeekTruth(1);
    const learning = buildR12Learning(run, truth);

    it("finds the ring and proposes a HOLD rule sourced to it", () => {
      expect(learning).not.toBeNull();
      expect(learning?.ring.size).toBe(23);
      expect(learning?.rule.action).toBe("HOLD");
      expect(learning?.rule.source).toBe(`ring ${learning?.ring.ring_id}`);
    });

    it("revises the rule by widening the signup-burst window, not the other axes", () => {
      const original = learning?.rule.when.all.find((c) => c.signal === "signup_burst");
      const revised = learning?.revised?.when.all.find((c) => c.signal === "signup_burst");
      expect(learning?.revised?.id).toBe(`${learning?.rule.id}-v2`);
      expect(revised?.window_min).toBe(Math.ceil((original?.window_min ?? 0) * 1.5));

      const originalOnboarding = learning?.rule.when.all.find((c) => c.signal === "onboarding_seconds");
      const revisedOnboarding = learning?.revised?.when.all.find((c) => c.signal === "onboarding_seconds");
      expect(revisedOnboarding?.max).toBe(originalOnboarding?.max);
    });

    it("closes some, but not all, of the red-team cases the revision was built from", () => {
      expect(learning?.cases.length).toBe(learning?.openCases.length);
      expect(learning?.closedCount).toBeGreaterThan(0);
      expect(learning?.closedCount).toBeLessThan(learning?.cases.length ?? 0);
    });
  });
});
