// One contract, two clients (task 2's "done when"): the in-memory mock, and the real client
// talking HTTP to the mock server. Anything the executor relies on is asserted here for both.
import { afterAll, describe, expect, it } from "vitest";
import { MockPayPal, PayPalError, createRealClient, startMockServer, type MockServer, type PayPalClient, type PayoutBatchRequest, type MockOptions } from "../src";

const isUnclaimed = (receiver: string) => receiver.endsWith("@unregistered.test");

function batch(id: string, receivers: string[]): PayoutBatchRequest {
  return {
    sender_batch_header: { sender_batch_id: id, email_subject: "Your $20 reward" },
    items: receivers.map((receiver, i) => ({ recipient_type: "EMAIL", receiver, amount: { value: "20.00", currency: "USD" }, sender_item_id: `${id}_${i}` })),
  };
}

const servers: MockServer[] = [];
afterAll(async () => Promise.all(servers.map((s) => s.close())));

const clients: Array<[string, (opts?: MockOptions) => Promise<{ client: PayPalClient; mock: MockPayPal }>]> = [
  ["in-memory mock", async (opts) => {
    const mock = new MockPayPal({ isUnclaimed, ...opts });
    return { client: mock, mock };
  }],
  ["real client over HTTP", async (opts) => {
    const server = await startMockServer(new MockPayPal({ isUnclaimed, ...opts }));
    servers.push(server);
    const client = createRealClient({ baseUrl: server.url, clientId: "id", clientSecret: "secret", webhookId: "WH-1", minIntervalMs: 0 });
    return { client, mock: server.mock };
  }],
];

describe.each(clients)("PayPalClient contract: %s", (_name, make) => {
  it("creates a batch whose items settle on first read", async () => {
    const { client } = await make();
    const created = await client.createBatch(batch("run_a", ["lee@example.test", "nobody@unregistered.test"]), "run_a");
    expect(created).toMatchObject({ batch_status: "PENDING" });
    const read = await client.getBatch(created.payout_batch_id!);
    expect(read.batch_header.batch_status).toBe("SUCCESS");
    expect(read.items.map((i) => [i.payout_item.sender_item_id, i.transaction_status])).toEqual([
      ["run_a_0", "SUCCESS"],
      ["run_a_1", "UNCLAIMED"],
    ]);
  });

  it("reads every page when a batch is larger than the server page size", async () => {
    const mock = new MockPayPal({ isUnclaimed });
    const server = await startMockServer(mock, { pageSize: 2 });
    servers.push(server);
    const client = createRealClient({ baseUrl: server.url, clientId: "id", clientSecret: "secret", webhookId: "WH-1", minIntervalMs: 0 });
    const created = await client.createBatch(batch("run_pages", Array.from({ length: 5 }, (_, i) => `p${i}@example.test`)), "run_pages");
    const result = await client.getBatch(created.payout_batch_id!);
    expect(result.items.map((i) => i.payout_item.sender_item_id)).toEqual(["run_pages_0", "run_pages_1", "run_pages_2", "run_pages_3", "run_pages_4"]);
  });

  it("never pays twice: a resent batch, same request id or not, is refused as a duplicate (the sandbox names no original)", async () => {
    const { client, mock } = await make();
    const first = await client.createBatch(batch("run_b", ["lee@example.test"]), "run_b");
    const replay = await client.createBatch(batch("run_b", ["lee@example.test"]), "run_b");
    const reused = await client.createBatch(batch("run_b", ["lee@example.test"]), "another-request-id");
    expect(first.payout_batch_id).toMatch(/^MOCKB/);
    for (const resent of [replay, reused]) expect(resent).toMatchObject({ payout_batch_id: null, duplicate: { name: "USER_BUSINESS_ERROR" } });
    expect(mock.paidCounts().get("run_b_0")).toBe(1);
  });

  it("with the spec's duplicate handling, a replay and a reused sender_batch_id both return the original batch", async () => {
    const { client, mock } = await make({ specDuplicates: true });
    const first = await client.createBatch(batch("run_b", ["lee@example.test"]), "run_b");
    const replay = await client.createBatch(batch("run_b", ["lee@example.test"]), "run_b");
    const reused = await client.createBatch(batch("run_b", ["lee@example.test"]), "another-request-id");
    expect(replay.payout_batch_id).toBe(first.payout_batch_id);
    expect(reused.payout_batch_id).toBe(first.payout_batch_id);
    expect(reused.duplicate?.name).toBe("USER_BUSINESS_ERROR");
    expect(mock.paidCounts().get("run_b_0")).toBe(1);
  });

  it("cancels an unclaimed item once, then reports it already cancelled", async () => {
    const { client } = await make();
    const created = await client.createBatch(batch("run_c", ["nobody@unregistered.test", "lee@example.test"]), "run_c");
    const [unclaimed, claimed] = (await client.getBatch(created.payout_batch_id!)).items;
    expect((await client.cancelItem(unclaimed!.payout_item_id)).transaction_status).toBe("RETURNED");
    await expect(client.cancelItem(unclaimed!.payout_item_id)).rejects.toMatchObject({ errorName: "ITEM_ALREADY_CANCELLED" });
    await expect(client.cancelItem(claimed!.payout_item_id)).rejects.toMatchObject({ errorName: "ITEM_INCORRECT_STATUS" });
    expect((await client.getItem(unclaimed!.payout_item_id)).transaction_status).toBe("RETURNED");
  });

  it("answers PayPal's sandbox test IDs the way the sandbox documents", async () => {
    const { client } = await make();
    expect((await client.cancelItem("POSPOI002")).transaction_status).toBe("RETURNED");
    for (const [id, name] of [["ERRPYO007", "ITEM_ALREADY_CANCELLED"], ["ERRPYO008", "ITEM_CANCELLATION_FAILED"], ["ERRPYO009", "ITEM_INCORRECT_STATUS"]]) {
      await expect(client.cancelItem(id!)).rejects.toBeInstanceOf(PayPalError);
      await expect(client.cancelItem(id!)).rejects.toMatchObject({ errorName: name });
    }
    expect((await client.getBatch("ERRPYOB004")).batch_header.batch_status).toBe("DENIED");
  });

  it("refuses a webhook without PayPal's signature headers without asking PayPal", async () => {
    const { client } = await make();
    expect(await client.verifyWebhook({ "content-type": "application/json" }, '{"id":"WH-1"}')).toBe(false);
    expect(await client.verifyWebhook({ "paypal-transmission-sig": "abc" }, "not json")).toBe(false);
  });

  it("verifies a signed webhook and rejects a tampered one", async () => {
    const { client, mock } = await make();
    const created = await client.createBatch(batch("run_d", ["lee@example.test"]), "run_d");
    await client.getBatch(created.payout_batch_id!);
    const event = mock.events.find((e) => e.resource.payout_batch_id === created.payout_batch_id);
    const { headers, body } = mock.signedWebhook(event!);
    expect(await client.verifyWebhook(headers, body)).toBe(true);
    expect(await client.verifyWebhook(headers, body.replace("SUCCESS", "FAILED"))).toBe(false);
  });
});
