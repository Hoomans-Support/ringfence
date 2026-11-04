import { describe, expect, it } from "vitest";
import { MockPayPal } from "@ringfence/paypal";
import { drainOutbox } from "../src/executor";
import { auth, crashOnceAt, expireLeases, fixture, setup, week1 } from "./helpers";

const post = (app: Awaited<ReturnType<typeof setup>>["app"], url: string, payload: unknown) => app.inject({ method: "POST", url, headers: auth, payload: payload as object });

async function week1Decided() {
  const mock = new MockPayPal();
  const ctx = await setup(mock);
  const run = (await post(ctx.app, "/v1/payout-runs", week1)).json();
  const pair = run.decisions.filter((d: { hold_group_id?: string }) => d.hold_group_id === "P-01").map((d: { sender_item_id: string }) => d.sender_item_id);
  return { ...ctx, mock, run, pair };
}

const R07 = {
  id: "R-07",
  action: "HOLD",
  when: { all: [
    { signal: "signup_burst", same: "referrer", window_min: 30, min_accounts: 5 },
    { signal: "onboarding_seconds", max: 120 },
    { signal: "activity_after_onboarding", max: 0 },
  ] },
};

describe("release", () => {
  it("a released payee gets a new batch of their own, and a retried release doesn't pay again", async () => {
    const { app, mock, run, pair } = await week1Decided();
    expect(pair).toHaveLength(2);

    const res = await post(app, "/v1/holds/release", { run_id: "run_2026w45", hold_group_id: "P-01", released_by: "rina@budgetapp.test" });
    expect(res.statusCode).toBe(201);
    const release = res.json();
    expect(release.sender_batch_id).toMatch(/^run_2026w45-rel-[0-9a-f]{10}$/);
    expect(release.released).toEqual(pair);
    expect(release.payout_batch_id).toMatch(/^MOCKB/);
    expect(release.payout_batch_id).not.toBe(run.paypal.payout_batch_id);
    const releaseBatch = await mock.getBatch(release.payout_batch_id);
    expect(releaseBatch.items.map((i) => i.payout_item.sender_item_id).sort()).toEqual(pair);

    const retry = await post(app, "/v1/holds/release", { run_id: "run_2026w45", hold_group_id: "P-01" });
    expect(retry.statusCode).toBe(200);
    expect(retry.json().sender_batch_id).toBe(release.sender_batch_id);
    for (const id of pair) expect(mock.paidCounts().get(id)).toBe(1);
  });

  it("a crash after PayPal accepted the release batch still pays each released payee once", async () => {
    const { app, db, mock, pair } = await week1Decided();
    crashOnceAt("after_paypal");
    expect((await post(app, "/v1/holds/release", { run_id: "run_2026w45", sender_item_ids: pair })).statusCode).toBe(202);
    await expireLeases(db);
    await drainOutbox(db, mock);
    for (const id of pair) expect(mock.paidCounts().get(id)).toBe(1);
    const states = (await app.inject({ url: "/v1/payout-runs/run_2026w45", headers: auth })).json().decisions.filter((d: { sender_item_id: string }) => pair.includes(d.sender_item_id));
    expect(states.map((d: { state: string }) => d.state)).toEqual(["sent", "sent"]);
  });

  it("refuses payees that aren't on hold", async () => {
    const { app, run } = await week1Decided();
    const paid = run.decisions.find((d: { decision: string }) => d.decision === "PAY").sender_item_id;
    expect((await post(app, "/v1/holds/release", { run_id: "run_2026w45", sender_item_ids: [paid] })).statusCode).toBe(409);
  });
});

describe("confirm and learn", () => {
  it("confirming a ring blocks it and blocks its devices on sight in later runs", async () => {
    const { app } = await week1Decided();
    const confirmed = (await post(app, "/v1/rings/R-01/confirm", { run_id: "run_2026w45", confirmed_by: "rina@budgetapp.test" })).json();
    expect(confirmed).toEqual({ ring_id: "R-01", blocked: 23, devices: 3, payout_addresses: 23, cancels_queued: 0, cancel_usd: 0 });

    const returning = {
      sender_batch_header: { sender_batch_id: "run_returning" },
      items: [{ ...week1.items[0], sender_item_id: "ref_new", receiver: "brand.new@example.test", context: { ...week1.items[0].context, account_id: "u_new" } }],
    };
    const decided = (await post(app, "/v1/payout-runs", returning)).json();
    expect(decided.decisions[0]).toMatchObject({ decision: "BLOCK", state: "blocked", rules: ["S-02"] });
  });

  it("a proposed rule is backtested, red-teamed and flagged before approval, then holds the week 2 disguise", async () => {
    const { app, mock } = await week1Decided();
    await post(app, "/v1/rings/R-01/confirm", { run_id: "run_2026w45" });

    expect((await post(app, "/v1/rules", { rule: { ...R07, action: "PAY" } })).statusCode).toBe(400);
    const proposed = await post(app, "/v1/rules", { rule: R07, source: "ring R-12, confirmed 2026-11-02" });
    expect(proposed.statusCode).toBe(201);
    const rule = proposed.json();
    expect(rule).toMatchObject({ rule_id: "R-07", version: 1, status: "proposed", backtest: { weeks: 1, caught: 23, usd: 460, false_holds: 0 } });
    expect(rule.red_team).toMatchObject({ variants: 200, held_out: 50 });
    // 23 of 412 is 5.6% of week 1: big enough that approving it takes a deliberate second look.
    expect(rule.flags).toEqual(["holds_over_5_percent"]);

    expect((await post(app, "/v1/rules/R-07/approve", { approved_by: "rina@budgetapp.test" })).statusCode).toBe(409);
    const approved = (await post(app, "/v1/rules/R-07/approve", { approved_by: "rina@budgetapp.test", acknowledge_flags: true })).json();
    expect(approved).toMatchObject({ status: "approved", approved_by: "rina@budgetapp.test" });

    const week2 = fixture("week2");
    const ring = new Set<string>(fixture("week2.truth").filter((t: { group: string }) => t.group === "ring").map((t: { sender_item_id: string }) => t.sender_item_id));
    const decided = (await post(app, "/v1/payout-runs", week2)).json();
    expect(decided.rule_set_version).toBe("starter-1+R-07v1");
    expect(decided.summary).toMatchObject({ paid: 419, held: 18, blocked: 0 });
    const held = decided.decisions.filter((d: { decision: string }) => d.decision === "HOLD");
    expect(new Set(held.map((d: { sender_item_id: string }) => d.sender_item_id))).toEqual(ring);
    expect(held.every((d: { rules: string[] }) => d.rules.join() === "R-07")).toBe(true);
    for (const id of ring) expect(mock.paidCounts().get(id)).toBeUndefined();
  });
});
