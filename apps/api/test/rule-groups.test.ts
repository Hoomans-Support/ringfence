// Payouts held only by a learned rule form that rule's hold group, "rule:R-07": never a ring, and
// never mistaken for a ring that happens to have the same number.
import { describe, expect, it } from "vitest";
import { MockPayPal } from "@ringfence/paypal";
import { ensureProgram } from "../src/db";
import { fixture, setup, week1 } from "./helpers";

const named = (body: { sender_batch_header: object; items: unknown[] }, id: string) => ({ ...body, sender_batch_header: { ...body.sender_batch_header, sender_batch_id: id } });
const week2 = fixture("week2");
const week1Ring = new Set<string>(fixture("week1.truth").filter((t: { group: string }) => t.group === "ring").map((t: { sender_item_id: string }) => t.sender_item_id));
const week2Ring = new Set<string>(fixture("week2.truth").filter((t: { group: string }) => t.group === "ring").map((t: { sender_item_id: string }) => t.sender_item_id));

type Decision = { sender_item_id: string; decision: string; state: string; ring_id?: string; hold_group_id?: string; rules: string[] };

/** A program whose week 1 ring is R-06 and whose rule learned from it is R-07, approved. */
async function learnedR07() {
  const mock = new MockPayPal();
  const ctx = await setup(mock);
  await ensureProgram(ctx.db, "demo", "Demo", "demo-key", undefined, { firstRingNumber: 6, firstRuleNumber: 7 });
  const headers = { authorization: "Bearer demo-key" };
  const post = (url: string, payload: object) => ctx.app.inject({ method: "POST", url, headers, payload });
  const get = (url: string) => ctx.app.inject({ url, headers });
  await post("/v1/payout-runs", named(week1, "run_w1"));
  const rule = (await post("/v1/rules", {
    rule: { action: "HOLD", when: { all: [
      { signal: "signup_burst", same: "referrer", window_min: 30, min_accounts: 5 },
      { signal: "onboarding_seconds", max: 120 },
      { signal: "activity_after_onboarding", max: 0 },
    ] } },
    learned_from: { ring_id: "R-06", run_id: "run_w1" },
  })).json();
  expect(rule.rule_id).toBe("R-07");
  await post("/v1/rules/R-07/approve", { approved_by: "rina@budgetapp.test", acknowledge_flags: true });
  return { ...ctx, mock, post, get };
}

describe("a learned rule's hold group", () => {
  it("week 2's 18 payouts held by R-07 share the hold group rule:R-07, with no ring number", async () => {
    const { post } = await learnedR07();
    const run = (await post("/v1/payout-runs", named(week2, "run_w2"))).json();
    const held: Decision[] = run.decisions.filter((d: Decision) => d.decision === "HOLD");
    expect(new Set(held.map((d) => d.sender_item_id))).toEqual(week2Ring);
    expect(held.every((d) => d.hold_group_id === "rule:R-07" && d.ring_id === undefined)).toBe(true);
  });

  it("releasing rule:R-07 pays its 18 payouts in a release batch of their own, exactly once", async () => {
    const { post, mock } = await learnedR07();
    await post("/v1/payout-runs", named(week2, "run_w2"));
    const released = (await post("/v1/holds/release", { run_id: "run_w2", hold_group_id: "rule:R-07" })).json();
    expect(new Set(released.released)).toEqual(week2Ring);
    expect(released.payout_batch_id).toMatch(/^MOCKB/);
    const again = (await post("/v1/holds/release", { run_id: "run_w2", hold_group_id: "rule:R-07" })).json();
    expect(again.sender_batch_id).toBe(released.sender_batch_id);
    for (const id of week2Ring) expect(mock.paidCounts().get(id)).toBe(1);
  });

  it("confirming rule:R-07 holds its payouts, confirmed, and adds their devices to confirmed fraud", async () => {
    const { post } = await learnedR07();
    await post("/v1/payout-runs", named(week2, "run_w2"));
    const confirmed = (await post("/v1/rings/rule:R-07/confirm", { run_id: "run_w2" })).json();
    expect(confirmed).toMatchObject({ ring_id: "rule:R-07", blocked: 18, devices: 18 });
    // One of those devices turns up again: held, confirmed, on sight (starter rule S-02).
    const again = (await post("/v1/payout-runs", named({ ...week2, items: week2.items.filter((i: { sender_item_id: string }) => i.sender_item_id === "w2_ref_1") }, "run_w2_again"))).json();
    expect(again.decisions[0]).toMatchObject({ decision: "BLOCK", rules: expect.arrayContaining(["S-02"]) });
  });

  it("with both a ring R-07 and rule R-07 in one run, each can be released or confirmed without touching the other", async () => {
    const { post } = await learnedR07();
    // Week 1's ring members come back alongside week 2's disguised accounts: the linked ones form
    // ring R-07; the disguised ones are held only by rule R-07.
    const both = named({ ...week2, items: [...week2.items, ...week1.items.filter((i: { sender_item_id: string }) => week1Ring.has(i.sender_item_id))] }, "run_both");
    const run = (await post("/v1/payout-runs", both)).json();
    const inGroup = (g: string) => run.decisions.filter((d: Decision) => d.hold_group_id === g).map((d: Decision) => d.sender_item_id);
    expect(new Set(inGroup("R-07"))).toEqual(week1Ring);
    expect(new Set(inGroup("rule:R-07"))).toEqual(week2Ring);
    // The ring's members match the rule too, and keep the ring as their hold group.
    expect(run.decisions.filter((d: Decision) => week1Ring.has(d.sender_item_id)).every((d: Decision) => d.ring_id === "R-07" && d.rules.includes("R-07"))).toBe(true);

    const released = (await post("/v1/holds/release", { run_id: "run_both", hold_group_id: "R-07" })).json();
    expect(new Set(released.released)).toEqual(week1Ring);
    const confirmed = (await post("/v1/rings/rule:R-07/confirm", { run_id: "run_both" })).json();
    expect(confirmed.blocked).toBe(18);

    const after = (await post("/v1/payout-runs", both)).json(); // a resend: reads back what was recorded
    const states = (ids: Set<string>) => new Set(after.decisions.filter((d: Decision) => ids.has(d.sender_item_id)).map((d: Decision) => d.state));
    expect(states(week1Ring)).toEqual(new Set(["sent"]));
    expect(states(week2Ring)).toEqual(new Set(["blocked"]));
  });

  it("the explanation of rule:R-07 says it's a learned rule's hold group, not a ring", async () => {
    const { post, get } = await learnedR07();
    await post("/v1/payout-runs", named(week2, "run_w2"));
    const explained = (await get("/v1/rings/rule:R-07?run_id=run_w2")).json();
    expect(explained).toMatchObject({ hold_group_id: "rule:R-07", kind: "rule", ring_id: null, size: 18, rules: ["R-07"] });
    const ring = (await get("/v1/rings/R-06?run_id=run_w1")).json();
    expect(ring).toMatchObject({ hold_group_id: "R-06", kind: "ring", ring_id: "R-06" });
    const pair = (await get("/v1/rings/P-01?run_id=run_w1")).json();
    expect(pair).toMatchObject({ hold_group_id: "P-01", kind: "pair", ring_id: null });
  });
});
