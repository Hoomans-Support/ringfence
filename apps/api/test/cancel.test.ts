import { describe, expect, it } from "vitest";
import { MockPayPal, type PayoutBatchRequest } from "@ringfence/paypal";
import { withProgram } from "../src/db";
import { drainOutbox } from "../src/executor";
import { queueFraudCancels } from "../src/holds";
import { pollBatches } from "../src/sync";
import { asBudgetApp, auth, crashOnceAt, expireLeases, fixture, setup, week1 } from "./helpers";

// Week 0 (PRD demo data): 398 paid straight through PayPal before Ringfence, 9 of them the ring's,
// and 4 of those 9 never claimed.
const week0 = fixture("week0");
const unclaimedRing = /^budgetfriend0[1-4]@/;

async function lastWeekPaidDirectly() {
  const mock = new MockPayPal({ isUnclaimed: (r) => unclaimedRing.test(r) });
  const ctx = await setup(mock);
  const direct: PayoutBatchRequest = {
    sender_batch_header: week0.sender_batch_header,
    items: week0.items.map(({ context: _c, ...item }: { context: unknown }) => item),
  };
  const { payout_batch_id } = await mock.createBatch(direct, week0.sender_batch_header.sender_batch_id);
  const imported = await ctx.app.inject({ method: "POST", url: "/v1/payout-runs/import", headers: auth, payload: { ...week0, payout_batch_id } });
  expect(imported.statusCode).toBe(201);
  await pollBatches(ctx.db, mock); // learns each week 0 payout's item id and status
  await ctx.app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 });
  const returned = async () =>
    (await asBudgetApp<{ n: number; usd: number }>(ctx.db, "SELECT count(*)::int AS n, coalesce(sum(amount_value::numeric), 0)::int AS usd FROM items WHERE run_id = 'run_2026w44' AND state = 'returned'"))[0];
  return { ...ctx, mock, returned };
}

describe("cancelling unclaimed payouts to a confirmed ring", () => {
  it("confirming the ring cancels last week's 4 unclaimed ring payouts: $80 back, once", async () => {
    const { app, mock, returned } = await lastWeekPaidDirectly();
    const imported = (await app.inject({ url: "/v1/payout-runs/run_2026w44", headers: auth })).json();
    expect(imported.decisions.filter((d: { state: string }) => d.state === "unclaimed")).toHaveLength(4);

    const confirmed = (await app.inject({ method: "POST", url: "/v1/rings/R-01/confirm", headers: auth, payload: { run_id: "run_2026w45" } })).json();
    expect(confirmed).toMatchObject({ blocked: 23, cancels_queued: 4, cancel_usd: 80 });
    expect(await returned()).toEqual({ n: 4, usd: 80 });
    const atPayPal = (await mock.getBatch(imported.paypal.payout_batch_id)).items.filter((i) => i.transaction_status === "RETURNED");
    expect(atPayPal.map((i) => i.payout_item.receiver).every((r) => unclaimedRing.test(r))).toBe(true);
    expect(atPayPal).toHaveLength(4);

    const again = (await app.inject({ method: "POST", url: "/v1/rings/R-01/confirm", headers: auth, payload: { run_id: "run_2026w45" } })).json();
    expect(again).toMatchObject({ blocked: 0, cancels_queued: 0 });
  });

  it("waits for last week's batch to finish processing before cancelling, then the cron's sweep queues them", async () => {
    const { app, db, mock, returned } = await lastWeekPaidDirectly();
    await db.query("UPDATE batches SET batch_status = 'PROCESSING' WHERE sender_batch_id = 'run_2026w44'");
    const confirmed = (await app.inject({ method: "POST", url: "/v1/rings/R-01/confirm", headers: auth, payload: { run_id: "run_2026w45" } })).json();
    expect(confirmed).toMatchObject({ blocked: 23, cancels_queued: 0 });

    await db.query("UPDATE batches SET batch_status = 'SUCCESS' WHERE sender_batch_id = 'run_2026w44'");
    expect(await withProgram(db, "budgetapp", (q) => queueFraudCancels(q, "budgetapp"))).toEqual({ queued: 4, usd: 80 });
    await drainOutbox(db, mock);
    expect(await returned()).toEqual({ n: 4, usd: 80 });
  });

  it("a crash after PayPal accepted a cancel is recorded as cancelled on retry, not cancelled twice", async () => {
    const { app, db, mock, returned } = await lastWeekPaidDirectly();
    crashOnceAt("after_cancel");
    await app.inject({ method: "POST", url: "/v1/rings/R-01/confirm", headers: auth, payload: { run_id: "run_2026w45" } });
    await expireLeases(db);
    await drainOutbox(db, mock);
    expect(await returned()).toEqual({ n: 4, usd: 80 });
    const notes = await asBudgetApp<{ detail: { note?: string } }>(db, "SELECT detail FROM audit_log WHERE action = 'payout_cancelled'");
    expect(notes).toHaveLength(4);
    expect(notes.filter((n) => n.detail.note === "already cancelled by an earlier attempt")).toHaveLength(1);
  });

  it("with sandbox test IDs, the cancel is driven by POSPOI002 and labelled as such", async () => {
    const { app, db, mock, returned } = await lastWeekPaidDirectly();
    process.env.PAYPAL_CANCEL_WITH_TEST_IDS = "true";
    try {
      await app.inject({ method: "POST", url: "/v1/rings/R-01/confirm", headers: auth, payload: { run_id: "run_2026w45" } });
    } finally {
      delete process.env.PAYPAL_CANCEL_WITH_TEST_IDS;
    }
    expect(await returned()).toEqual({ n: 4, usd: 80 });
    const labelled = await asBudgetApp<{ detail: { sandbox_test_id?: string } }>(db, "SELECT detail FROM audit_log WHERE action = 'payout_cancelled'");
    expect(labelled.every((l) => l.detail.sandbox_test_id === "POSPOI002")).toBe(true);
    // The real items were never touched at PayPal: they're still unclaimed there.
    expect(mock.events.filter((e) => e.event_type === "PAYMENT.PAYOUTS-ITEM.CANCELED")).toHaveLength(0);
  });
});
