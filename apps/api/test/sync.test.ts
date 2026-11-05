import { describe, expect, it } from "vitest";
import { MockPayPal, type WebhookEvent } from "@ringfence/paypal";
import { pollBatches, reconcile } from "../src/sync";
import { asBudgetApp, auth, crashOnceAt, setup, week1 } from "./helpers";

// Four honest payees (the first after the ring, roommates and coworkers) who never claim, so
// their payouts settle UNCLAIMED.
const unclaimed = new Set<string>(week1.items.slice(30, 34).map((i: { receiver: string }) => i.receiver));

async function sentRun() {
  const mock = new MockPayPal({ isUnclaimed: (r) => unclaimed.has(r) });
  const ctx = await setup(mock);
  const run = (await ctx.app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 })).json();
  const states = async () => {
    const { decisions } = (await ctx.app.inject({ url: "/v1/payout-runs/run_2026w45", headers: auth })).json() as { decisions: Array<{ state: string }> };
    return decisions.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.state]: (acc[d.state] ?? 0) + 1 }), {});
  };
  const deliver = async (event: WebhookEvent, tamper = false) => {
    const { headers, body } = mock.signedWebhook(event);
    const res = await ctx.app.inject({ method: "POST", url: "/v1/webhooks/paypal", headers, payload: tamper ? body.replace(/"SUCCESS"/g, '"FAILED"') : body });
    return { status: res.statusCode, outcome: res.json().outcome as string };
  };
  return { ...ctx, mock, batchId: run.paypal.payout_batch_id as string, states, deliver };
}

describe("webhooks", () => {
  it("statuses update from verified events, and only from verified events", async () => {
    const { mock, batchId, states, deliver } = await sentRun();
    await mock.getBatch(batchId); // PayPal settles the batch and emits one event per item
    const events = mock.events.filter((e) => e.resource.payout_batch_id === batchId);
    expect(events).toHaveLength(387);

    expect(await deliver(events[0]!, true)).toEqual({ status: 400, outcome: "unverified" });
    expect(await states()).toEqual({ sent: 387, held: 25 });

    for (const event of events) expect((await deliver(event)).outcome).toBe("applied");
    expect(await states()).toEqual({ succeeded: 383, unclaimed: 4, held: 25 });
  });

  it("a redelivered event is applied once, and a late out-of-order one can't move an item back", async () => {
    const { mock, batchId, states, deliver } = await sentRun();
    await mock.getBatch(batchId);
    const succeeded = mock.events.find((e) => e.event_type === "PAYMENT.PAYOUTS-ITEM.SUCCEEDED")!;
    expect((await deliver(succeeded)).outcome).toBe("applied");
    expect((await deliver(succeeded)).outcome).toBe("duplicate");
    const late = { ...succeeded, id: "WH-LATE", event_type: "PAYMENT.PAYOUTS-ITEM.HELD", resource: { ...succeeded.resource, transaction_status: "ONHOLD" as const } };
    expect((await deliver(late)).outcome).toBe("ignored");
    expect((await states()).succeeded).toBe(1);
  });

  it("answers 5xx when PayPal can't be asked to verify, so PayPal redelivers instead of the event being dropped", async () => {
    const mock = new MockPayPal();
    const { app } = await setup({ ...mock, createBatch: mock.createBatch.bind(mock), getBatch: mock.getBatch.bind(mock), getItem: mock.getItem.bind(mock), cancelItem: mock.cancelItem.bind(mock), verifyWebhook: () => Promise.reject(new Error("fetch failed: ECONNRESET")) });
    const res = await app.inject({ method: "POST", url: "/v1/webhooks/paypal", headers: { "content-type": "application/json" }, payload: { id: "WH-1", event_type: "PAYMENT.PAYOUTS-ITEM.SUCCEEDED" } });
    expect(res.statusCode).toBe(500);
  });

  it("lists recent verified events for the admin token only", async () => {
    const { app, mock, batchId, deliver } = await sentRun();
    await mock.getBatch(batchId);
    await deliver(mock.events[0]!);
    expect((await app.inject({ url: "/v1/webhooks/events" })).statusCode).toBe(404);
    const res = await app.inject({ url: "/v1/webhooks/events", headers: { authorization: "Bearer admin-token" } });
    expect(res.json()[0]).toMatchObject({ event_type: "PAYMENT.PAYOUTS-ITEM.SUCCEEDED", payout_batch_id: batchId, applied: true });
  });
});

describe("poller", () => {
  it("brings every sent item up to PayPal's status, and finishes after being killed mid-batch", async () => {
    const { db, mock, states } = await sentRun();
    crashOnceAt("mid_poll");
    await expect(pollBatches(db, mock)).rejects.toThrow(/mid_poll/);
    expect(await states()).toEqual({ succeeded: 1, sent: 386, held: 25 });
    expect(await pollBatches(db, mock)).toBe(386);
    expect(await states()).toEqual({ succeeded: 383, unclaimed: 4, held: 25 });
    expect(await pollBatches(db, mock)).toBe(0); // nothing left waiting on PayPal
  });
});

describe("reconciler", () => {
  it("applies what PayPal moved forward and reports every gap it can't explain", async () => {
    const { db, mock, states } = await sentRun();
    await pollBatches(db, mock);
    expect((await reconcile(db, mock)).gaps).toEqual([]);

    const [paidItem, unclaimedItem] = await asBudgetApp<{ sender_item_id: string }>(
      db,
      "SELECT sender_item_id FROM items WHERE state IN ('succeeded', 'unclaimed') ORDER BY state, sender_item_id LIMIT 2 OFFSET 382",
    );
    await asBudgetApp(db, "UPDATE items SET state = 'sent' WHERE sender_item_id = $1", [paidItem!.sender_item_id]); // a missed update
    await asBudgetApp(db, "UPDATE items SET state = 'succeeded' WHERE sender_item_id = $1", [unclaimedItem!.sender_item_id]); // disagrees with PayPal
    await asBudgetApp(
      db,
      `INSERT INTO items (program_id, run_id, sender_item_id, receiver, amount_value, currency, context, decision, reasons, rules, state, batch_id)
       VALUES ('budgetapp', 'run_2026w45', 'ref_phantom', 'phantom@example.test', '20.00', 'USD', '{}', 'PAY', '[]', '["S-00"]', 'sent', 'run_2026w45')`,
    );

    const report = await reconcile(db, mock);
    expect(report.applied).toBe(1);
    expect(report.gaps).toEqual([
      { sender_batch_id: "run_2026w45", sender_item_id: unclaimedItem!.sender_item_id, issue: "status_conflict", ours: "succeeded", paypal: "UNCLAIMED" },
      { sender_batch_id: "run_2026w45", sender_item_id: "ref_phantom", issue: "not_at_paypal", ours: "sent" },
    ]);
    // The missed update is applied; the conflict is reported, not overwritten, so it stays succeeded for a person to look at.
    expect((await states()).succeeded).toBe(384);
    const logged = await asBudgetApp(db, "SELECT detail FROM audit_log WHERE action = 'reconcile_gap'");
    expect(logged).toHaveLength(2);
  });
});
