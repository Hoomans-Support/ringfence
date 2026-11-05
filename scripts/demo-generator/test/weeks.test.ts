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
import { generateWeek1 } from "../src/week1";
import { generateWeek0, generateWeek2, generateWeek3, generateWeek4, generateSurveyApp } from "../src/weeks";

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

describe("generateWeek3", () => {
  it("splits Week 1's real R-07 misses into cases R-07-v2 closes and cases that still evade it", () => {
    const { truth } = generateWeek3(42);
    const ring = truth.filter((label) => label.group === "ring");
    const closed = ring.filter((label) => label.ring_label === "R-12 (R-07-v2 case)");
    const stillEvades = ring.filter((label) => label.ring_label === "R-12 (still evades R-07-v2)");

    // Both buckets exist: a clean sweep (or a total miss) would be a flattering, dishonest demo,
    // which is exactly what the module doc says generateWeek3 avoids by deriving its split from the
    // app's own real red-team misses instead of a hand-picked ratio.
    expect(closed.length).toBeGreaterThan(0);
    expect(stillEvades.length).toBeGreaterThan(0);
    expect(closed.length + stillEvades.length).toBe(ring.length);
    expect(ring.every((label) => label.account_id.startsWith("u_w3_"))).toBe(true);
  });

  it("carries Week 2's honest payees forward unchanged, under Week 3's own batch id", () => {
    const week2 = generateWeek2(42);
    const week3 = generateWeek3(42);
    const week2Honest = week2.truth.filter((label) => label.group === "honest");
    const week3Honest = week3.truth.filter((label) => label.group === "honest");
    expect(week3Honest).toEqual(week2Honest);
    expect(week3.run.sender_batch_header.sender_batch_id).toBe("run_2026w47");
  });

  it("gives every disguised ring item its own unique device, distinct from Week 1 and Week 2's", () => {
    const { run, truth } = generateWeek3(42);
    const ringIds = new Set(truth.filter((label) => label.group === "ring").map((label) => label.sender_item_id));
    const devices = run.items.filter((item) => ringIds.has(item.sender_item_id)).map((item) => item.context.device_hash);
    expect(new Set(devices).size).toBe(devices.length);
  });
});

describe("generateSurveyApp", () => {
  it("makes exactly 6 of 120 payees reuse one of Week 1 R-12's real devices, the rest honest", () => {
    const week1 = generateWeek1(42);
    const ringDevices = new Set(
      week1.run.items
        .filter((item) => week1.truth.some((label) => label.sender_item_id === item.sender_item_id && label.group === "ring"))
        .map((item) => item.context.device_hash),
    );
    const { run, truth } = generateSurveyApp(42);
    expect(run.items.length).toBe(120);
    const matches = truth.filter((label) => label.group === "ring_match");
    expect(matches.length).toBe(6);
    expect(truth.filter((label) => label.group === "honest").length).toBe(114);
    for (const label of matches) {
      const item = run.items.find((i) => i.sender_item_id === label.sender_item_id);
      expect(ringDevices.has(item?.context.device_hash ?? "")).toBe(true);
    }
  });
});

describe("generateWeek4", () => {
  it("wraps the survey-app run under the main narrative's own batch id", () => {
    const { run, truth } = generateWeek4(42);
    expect(run.sender_batch_header.sender_batch_id).toBe("run_2026w48");
    expect(truth.filter((label) => label.group === "ring_match").length).toBe(6);
  });

  it("records Week 1's R-12 payouts as a fixture-only unclaimed cancellation, not a real PayPal state", () => {
    const week1 = generateWeek1(42);
    const week1RingIds = week1.truth.filter((label) => label.group === "ring" && label.ring_label === "R-12").map((label) => label.sender_item_id);
    const week1RingTotalCents = week1.run.items
      .filter((item) => week1RingIds.includes(item.sender_item_id))
      .reduce((total, item) => total + Math.round(Number(item.amount.value) * 100), 0);

    const { demo } = generateWeek4(42);
    expect(demo?.kind).toBe("cross_program_recovery");
    expect(demo?.recovery.status).toBe("fixture_cancelled_unclaimed");
    expect(demo?.recovery.source_run_id).toBe(week1.run.sender_batch_header.sender_batch_id);
    expect(demo?.recovery.sender_item_ids.sort()).toEqual([...week1RingIds].sort());
    expect(demo?.recovery.amount_usd).toBe(week1RingTotalCents / 100);
  });
});
