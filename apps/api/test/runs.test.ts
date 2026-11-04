import { describe, expect, it } from "vitest";
import { MockPayPal, type PayPalClient } from "@ringfence/paypal";
import { drainOutbox } from "../src/executor";
import { pollBatches } from "../src/sync";
import { auth, crashOnceAt, expireLeases, setup, week1 } from "./helpers";

function expectPaidExactlyOnce(mock: MockPayPal, decisions: Array<{ sender_item_id: string; decision: string }>) {
  const counts = mock.paidCounts();
  for (const d of decisions) expect(counts.get(d.sender_item_id) ?? 0, d.sender_item_id).toBe(d.decision === "PAY" ? 1 : 0);
}

describe("POST /v1/payout-runs", () => {
  it("decides a 412-item run, sends the 387 paid payees as one PayPal batch and returns its id", async () => {
    const mock = new MockPayPal();
    const { app } = await setup(mock);
    const res = await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.summary).toEqual({ paid: 387, held: 25, blocked: 0, paid_usd: 7740, held_usd: 500, blocked_usd: 0 });
    expect(body.paypal.payout_batch_id).toMatch(/^MOCKB/);
    expect(body.paypal.sender_batch_id).toBe("run_2026w45");
    expect(body.decisions.every((d: { rules: string[] }) => d.rules.length > 0)).toBe(true);
    expect(body.decisions.filter((d: { state: string }) => d.state === "sent")).toHaveLength(387);
    expect(body.decisions.filter((d: { state: string }) => d.state === "held")).toHaveLength(25);
    expectPaidExactlyOnce(mock, body.decisions);
  });

  it("resending a run returns the original decisions and batch without sending anything", async () => {
    const mock = new MockPayPal();
    const { app } = await setup(mock);
    const first = (await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 })).json();
    const again = await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 });
    expect(again.statusCode).toBe(200);
    expect(again.json().paypal.payout_batch_id).toBe(first.paypal.payout_batch_id);
    expectPaidExactlyOnce(mock, first.decisions);
    const fetched = await app.inject({ url: "/v1/payout-runs/run_2026w45", headers: auth });
    expect(fetched.json().paypal.payout_batch_id).toBe(first.paypal.payout_batch_id);
  });

  it("a retry after a crash at after_claim (before PayPal was called) sends the batch once", async () => {
    const mock = new MockPayPal();
    const { app, db } = await setup(mock);
    crashOnceAt("after_claim");
    const res = await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 });
    expect(res.statusCode).toBe(202);
    expect(res.json().paypal.payout_batch_id).toBeNull();

    await expireLeases(db);
    expect(await drainOutbox(db, mock)).toBe(1);
    const after = (await app.inject({ url: "/v1/payout-runs/run_2026w45", headers: auth })).json();
    expect(after.paypal.payout_batch_id).toMatch(/^MOCKB/);
    expectPaidExactlyOnce(mock, after.decisions);
  });

  // The sandbox's own behaviour (smoke run, 4 Nov 2026): the retry's duplicate is refused with no
  // link and no request-id replay, so the batch id arrives with the first webhook instead.
  it("a crash after PayPal accepted the batch: the retry is refused as a duplicate, nobody is paid twice, and the first webhook names the batch", async () => {
    const mock = new MockPayPal();
    const { app, db } = await setup(mock);
    crashOnceAt("after_paypal");
    await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 });
    await expireLeases(db);
    expect(await drainOutbox(db, mock)).toBe(1);

    const retried = (await app.inject({ url: "/v1/payout-runs/run_2026w45", headers: auth })).json();
    expect(retried.paypal.payout_batch_id).toBeNull();
    expect(retried.decisions.filter((d: { state: string }) => d.state === "sent")).toHaveLength(387);
    expectPaidExactlyOnce(mock, retried.decisions);

    const [batchId] = [...new Set(mock.ledger().map((i) => i.payout_batch_id))];
    await mock.getBatch(batchId!); // PayPal settles the batch and sends its webhooks
    const { headers, body } = mock.signedWebhook(mock.events[0]!);
    expect((await app.inject({ method: "POST", url: "/v1/webhooks/paypal", headers, payload: body })).json().outcome).toBe("applied");
    await pollBatches(db, mock);

    const settled = (await app.inject({ url: "/v1/payout-runs/run_2026w45", headers: auth })).json();
    expect(settled.paypal.payout_batch_id).toBe(batchId);
    expect(settled.decisions.filter((d: { state: string }) => d.state === "paid")).toHaveLength(387);
    expectPaidExactlyOnce(mock, settled.decisions);
  });

  it("with the spec's duplicate handling (a link to the original), the retry recovers the batch id directly", async () => {
    const mock = new MockPayPal({ specDuplicates: true });
    let attempt = 0;
    // A client that forgets PayPal-Request-Id between attempts, so only sender_batch_id dedupes.
    const forgetful: PayPalClient = {
      createBatch: (body) => mock.createBatch(body, `attempt-${++attempt}`),
      getBatch: (id) => mock.getBatch(id),
      getItem: (id) => mock.getItem(id),
      cancelItem: (id) => mock.cancelItem(id),
      verifyWebhook: (h, b) => mock.verifyWebhook(h, b),
    };
    const { app, db } = await setup(forgetful);
    crashOnceAt("after_paypal");
    await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 });
    await expireLeases(db);
    await drainOutbox(db, forgetful);
    const after = (await app.inject({ url: "/v1/payout-runs/run_2026w45", headers: auth })).json();
    expect(attempt).toBe(2);
    expect(after.paypal.payout_batch_id).toMatch(/^MOCKB/);
    expectPaidExactlyOnce(mock, after.decisions);
  });

  it("rejects requests without a key, malformed bodies and repeated sender_item_ids", async () => {
    const { app } = await setup();
    expect((await app.inject({ method: "POST", url: "/v1/payout-runs", payload: week1 })).statusCode).toBe(401);
    const noAmount = { ...week1, items: [{ ...week1.items[0], amount: undefined }] };
    expect((await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: noAmount })).statusCode).toBe(400);
    const repeated = { ...week1, items: [week1.items[0], week1.items[0]] };
    const res = await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: repeated });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/unique/);
  });

  it("accepts a plain PayPal body with no context: every payee is its own unlinked account", async () => {
    const { app } = await setup();
    const plain = {
      sender_batch_header: { sender_batch_id: "plain_1" },
      items: ["a@example.test", "b@example.test"].map((receiver, i) => ({ recipient_type: "EMAIL", receiver, amount: { value: "5.00", currency: "USD" }, sender_item_id: `p${i}` })),
    };
    const res = await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: plain });
    expect(res.statusCode).toBe(201);
    expect(res.json().summary.paid).toBe(2);
  });
});

describe("tenant isolation", () => {
  it("one program can't read another's run, through the API or the database", async () => {
    const { app, db } = await setup();
    await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 });
    expect((await app.inject({ url: "/v1/payout-runs/run_2026w45", headers: { authorization: "Bearer survey-key" } })).statusCode).toBe(404);

    // Tests run as an ordinary role (helpers.ts), so this is row-level security itself answering.
    const count = async (program: string) => {
      const [row] = await db.tx(async (q) => {
        await q.query("SELECT set_config('app.program_id', $1, true)", [program]);
        return q.query<{ n: number }>("SELECT count(*)::int AS n FROM items");
      });
      return row?.n;
    };
    expect((await db.query<{ n: number }>("SELECT count(*)::int AS n FROM items"))[0]?.n).toBe(0);
    expect(await count("surveyapp")).toBe(0);
    expect(await count("budgetapp")).toBe(412);
  });
});
