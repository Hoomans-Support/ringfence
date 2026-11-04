/**
 * Regression for a real bug found in an audit pass (4 Nov): generateWeek2's "skip the disguised
 * ring items when remapping dates onto Week 2's timeline" check matched on the literal id prefix
 * "w2_ref_", which also matches the synthetic honest payees' own ids (w2_ref_honest_N) - so those
 * honest accounts kept stale Week 1-era signup dates instead of being shifted onto Week 2's
 * Nov 9 payout anchor like every other honest item. Confirmed against the committed
 * fixtures/week2.json before the fix: all 37 w2_ref_honest_* items had Oct 27-31 dates while the
 * correctly-shifted base honest items (ref_*) had Nov 3-7 dates.
 */
import { describe, expect, it } from "vitest";
import { generateWeek0, generateWeek2 } from "../src/weeks";

describe("generateWeek2", () => {
  it("shifts every honest payee's signup date onto Week 2's timeline, not just the base ones", () => {
    const { run, truth } = generateWeek2(42);
    const honestIds = new Set(truth.filter((label) => label.group === "honest").map((label) => label.sender_item_id));
    expect(honestIds.size).toBeGreaterThan(0);

    // The bug kept stale Week 1-era dates (confirmed against the committed fixture: Oct 27-31,
    // days before Week 1's own Nov 2 payout). Anything on or after Nov 1 is on Week 2's timeline;
    // a one-item, same-day overshoot just past the Nov 9 payout is a separate, pre-existing,
    // sub-24h rounding quirk in generateWeek1's own honest-date spread, not this bug.
    const weekStart = Date.parse("2026-11-01T00:00:00Z");
    for (const item of run.items) {
      if (!honestIds.has(item.sender_item_id)) continue;
      const signupAt = Date.parse(item.context.signup_at);
      expect(signupAt, `${item.sender_item_id} should be on Week 2's timeline`).toBeGreaterThanOrEqual(weekStart);
    }
  });

  it("still gives the 18 disguised ring items their own near-payout dates, unaffected by the honest-payee fix", () => {
    const { run, truth } = generateWeek2(42);
    const ringItems = run.items.filter((item) =>
      truth.some((label) => label.sender_item_id === item.sender_item_id && label.group === "ring"),
    );
    expect(ringItems.length).toBe(18);

    const payoutAt = Date.parse("2026-11-09T09:00:00Z");
    for (const item of ringItems) {
      const signupAt = Date.parse(item.context.signup_at);
      const daysBeforePayout = (payoutAt - signupAt) / (24 * 60 * 60 * 1000);
      expect(daysBeforePayout).toBeGreaterThanOrEqual(3);
      expect(daysBeforePayout).toBeLessThanOrEqual(3.5);
    }
  });
});

describe("generateWeek0", () => {
  it("keeps exactly 9 of the 23 ring accounts, matching the task board's done-when", () => {
    const { truth } = generateWeek0(42);
    expect(truth.filter((label) => label.group === "ring").length).toBe(9);
  });
});
