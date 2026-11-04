/**
 * Day-one smoke tests 1 to 7 (PRD, Build plan) as one script, through the same real PayPal client
 * the executor uses. Writes what it saw to docs/smoke-test-results.md when run against the sandbox.
 *
 *   npm run smoke              against the sandbox (.env: PAYPAL_CLIENT_ID/SECRET; SMOKE_RECEIVER for test 2)
 *   npm run smoke -- --mock    the same script against the local mock server, to check the script itself
 *
 * Test 6 needs somewhere PayPal can deliver webhooks: set RINGFENCE_API_URL and ADMIN_TOKEN to a
 * deployed Ringfence API (it records verified events at GET /v1/webhooks/events). Without them it's
 * reported as skipped, not passed.
 */
import { existsSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  MockPayPal,
  PayPalError,
  createRealClient,
  startMockServer,
  type ItemStatus,
  type PayoutBatchRequest,
  type PayPalClient,
} from "@ringfence/paypal";

const MOCK = process.argv.includes("--mock");
if (!MOCK && existsSync(".env")) process.loadEnvFile(".env");

type Outcome = "PASS" | "FAIL" | "SKIP" | "FALLBACK";
interface Result {
  test: number;
  name: string;
  outcome: Outcome;
  detail: string;
}

const results: Result[] = [];
function record(test: number, name: string, outcome: Outcome, detail: string): void {
  results.push({ test, name, outcome, detail });
  console.log(`${String(test).padStart(2)}. ${outcome.padEnd(8)} ${name} — ${detail}`);
}

// Every request this script makes, timestamped, for test 7's per-minute count.
const requestTimes: number[] = [];
const countingFetch: typeof fetch = (input, init) => {
  requestTimes.push(Date.now());
  return fetch(input, init);
};

function oneItem(senderBatchId: string, receiver: string): PayoutBatchRequest {
  return {
    sender_batch_header: { sender_batch_id: senderBatchId, email_subject: "Ringfence smoke test" },
    items: [{ recipient_type: "EMAIL", receiver, amount: { value: "1.00", currency: "USD" }, sender_item_id: `${senderBatchId}_1` }],
  };
}

async function waitForStatus(
  client: PayPalClient,
  payoutBatchId: string,
  wanted: ItemStatus[],
  timeoutMs: number,
  pollMs: number,
): Promise<{ status: ItemStatus | undefined; payoutItemId: string | undefined; waitedMs: number }> {
  const started = Date.now();
  let last: { status: ItemStatus | undefined; payoutItemId: string | undefined } = { status: undefined, payoutItemId: undefined };
  while (Date.now() - started < timeoutMs) {
    const batch = await client.getBatch(payoutBatchId);
    const item = batch.items[0];
    last = { status: item?.transaction_status, payoutItemId: item?.payout_item_id };
    // The batch has to finish too: PayPal refuses to cancel an item while its batch is still
    // processing (BATCH_NOT_COMPLETED), even once the item itself reads UNCLAIMED.
    if (last.status && wanted.includes(last.status) && batch.batch_header.batch_status !== "PROCESSING" && batch.batch_header.batch_status !== "PENDING") break;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return { ...last, waitedMs: Date.now() - started };
}

function finish(): void {
  const failed = results.some((r) => r.outcome === "FAIL");
  if (!MOCK) {
    const rows = [...results].sort((a, b) => a.test - b.test).map((r) => `| ${r.test} | ${r.name} | ${r.outcome} | ${r.detail.replace(/\|/g, "\\|")} |`);
    writeFileSync(
      "docs/smoke-test-results.md",
      `# Day-one smoke tests\n\nRun ${new Date().toISOString()} against ${process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com"} by \`npm run smoke\`.\n\n| # | Test | Result | What happened |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n`,
    );
    console.log("\nRecorded in docs/smoke-test-results.md");
  }
  process.exitCode = failed ? 1 : 0;
}

async function main(): Promise<void> {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  let client: PayPalClient;
  let closeMock: (() => Promise<void>) | undefined;
  let mockWebhookEvents: string[] | undefined;
  const pollMs = MOCK ? 0 : 15_000;
  const timeoutMs = MOCK ? 1_000 : 10 * 60_000;
  // Test 2 pays this sandbox personal account; without it, test 2 is skipped and the rest still run.
  const receiver = MOCK ? "sandbox-personal@example.test" : process.env.SMOKE_RECEIVER;

  if (MOCK) {
    // A local receiver stands in for the deployed API, verifying each webhook the mock delivers.
    mockWebhookEvents = [];
    const verified = mockWebhookEvents;
    const receiverServer = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", async () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (await client.verifyWebhook(req.headers, body)) verified.push((JSON.parse(body) as { event_type: string }).event_type);
        res.end();
      });
    });
    await new Promise<void>((r) => receiverServer.listen(0, "127.0.0.1", r));
    const hookUrl = `http://127.0.0.1:${(receiverServer.address() as AddressInfo).port}/`;
    const server = await startMockServer(new MockPayPal({ isUnclaimed: (r) => r.includes("never-registered") }), { webhookUrl: hookUrl });
    client = createRealClient({ baseUrl: server.url, clientId: "mock", clientSecret: "mock", webhookId: "WH-MOCK", minIntervalMs: 0, fetch: countingFetch });
    closeMock = async () => {
      await server.close();
      await new Promise<void>((r) => receiverServer.close(() => r()));
    };
  } else {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) throw new Error("Fill PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env");
    client = createRealClient({
      baseUrl: process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com",
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      webhookId: process.env.PAYPAL_WEBHOOK_ID,
      fetch: countingFetch,
    });
  }
  console.log(`Smoke tests against ${MOCK ? "the local mock server" : "the PayPal sandbox"} (${stamp})\n`);

  // 1. Token, and the Payouts API answering it: a batch that doesn't exist should come back 404 (the
  //    API knows us); only 401/403 (bad credentials, or Payouts not on for this app) fail. PayPal's
  //    documented batch-status test IDs (ERRPYOB001-004) are read too and recorded as found: on
  //    this sandbox they have answered 404, so they're information, not the pass condition.
  const answer = (id: string) =>
    client.getBatch(id).then((b) => b.batch_header.batch_status, (e) => (e instanceof PayPalError ? `${e.status} ${e.errorName}` : String(e)));
  const probe = await answer(`RFPROBE${stamp.slice(-6)}`); // PayPal's own id shape: upper-case letters and digits
  if (/^(401|403) |TOKEN_FAILED/.test(probe)) {
    record(1, "Token issued, Payouts reachable", "FAIL", `unknown batch answered ${probe}`);
    return;
  }
  const testIds = [];
  for (const id of ["ERRPYOB001", "ERRPYOB002", "ERRPYOB003", "ERRPYOB004"]) testIds.push(`${id}=${await answer(id)}`);
  record(1, "Token issued, Payouts reachable", "PASS", `unknown batch -> ${probe}; sandbox test IDs: ${testIds.join(", ")}`);

  // 2 and 4 are created up front and polled together, so the 10-minute waits overlap.
  const paidId = `smoke_${stamp}_paid`;
  const unclaimedId = `smoke_${stamp}_unclaimed`;
  const unclaimedReceiver = `ringfence-never-registered-${stamp}@example.com`;
  const created = async (id: string, to: string) => {
    const result = await client.createBatch(oneItem(id, to), id);
    if (!result.payout_batch_id) throw new Error(`a fresh sender_batch_id ${id} was refused as a duplicate`);
    return { ...result, payout_batch_id: result.payout_batch_id };
  };
  const unclaimed = await created(unclaimedId, unclaimedReceiver);
  const paid = receiver ? await created(paidId, receiver) : undefined;

  // 3. Reuse a sender_batch_id: PayPal must refuse a second batch, whether the PayPal-Request-Id is
  //    the same (what the executor's retry sends) or new. Whether PayPal names the original batch
  //    (spec) or not (what this sandbox has done) is recorded: the executor handles both.
  const sameRequest = await client.createBatch(oneItem(unclaimedId, unclaimedReceiver), unclaimedId);
  const newRequest = await client.createBatch(oneItem(unclaimedId, unclaimedReceiver), `${unclaimedId}-retry`);
  const refused = (r: typeof newRequest) => r.payout_batch_id === null ? Boolean(r.duplicate) : r.payout_batch_id === unclaimed.payout_batch_id;
  const describe = (r: typeof newRequest) =>
    r.duplicate ? `refused (${r.duplicate.message})${r.payout_batch_id ? `, original ${r.payout_batch_id} named` : ", original not named"}` : r.payout_batch_id === unclaimed.payout_batch_id ? "replayed the original batch" : `NEW BATCH ${r.payout_batch_id}`;
  record(
    3,
    "Reused sender_batch_id rejected",
    refused(sameRequest) && refused(newRequest) ? "PASS" : "FAIL",
    `same request id: ${describe(sameRequest)}; new request id: ${describe(newRequest)}`,
  );

  const [paidResult, unclaimedResult] = await Promise.all([
    paid ? waitForStatus(client, paid.payout_batch_id, ["SUCCESS", "FAILED", "RETURNED", "BLOCKED"], timeoutMs, pollMs) : undefined,
    waitForStatus(client, unclaimed.payout_batch_id, ["UNCLAIMED", "FAILED", "RETURNED", "BLOCKED"], timeoutMs, pollMs),
  ]);
  if (paid && paidResult) {
    record(
      2,
      "One-item payout reaches SUCCESS",
      paidResult.status === "SUCCESS" ? "PASS" : "FAIL",
      `batch ${paid.payout_batch_id}, item ${paidResult.status ?? "none"} after ${Math.round(paidResult.waitedMs / 1000)}s`,
    );
  } else {
    record(2, "One-item payout reaches SUCCESS", "SKIP", "set SMOKE_RECEIVER in .env to the sandbox personal account's email");
  }
  record(
    4,
    "Unregistered email goes UNCLAIMED",
    unclaimedResult.status === "UNCLAIMED" ? "PASS" : "FALLBACK",
    `batch ${unclaimed.payout_batch_id}, item ${unclaimedResult.status ?? "none"}${unclaimedResult.status === "UNCLAIMED" ? "" : "; cancel demo uses sandbox test IDs"}`,
  );

  // 5. Cancel the unclaimed item, then cancel it again. On a 500 (or no UNCLAIMED item to try),
  //    drive the flow with PayPal's sandbox test IDs instead and say so.
  const cancelNotes: string[] = [];
  let cancelOutcome: Outcome = "FALLBACK";
  if (unclaimedResult.status === "UNCLAIMED" && unclaimedResult.payoutItemId) {
    try {
      const first = await client.cancelItem(unclaimedResult.payoutItemId);
      cancelNotes.push(`first cancel -> ${first.transaction_status}`);
      try {
        await client.cancelItem(unclaimedResult.payoutItemId);
        cancelNotes.push("second cancel -> accepted (unexpected)");
      } catch (err) {
        cancelNotes.push(`second cancel -> ${err instanceof PayPalError ? err.errorName : String(err)}`);
        cancelOutcome = first.transaction_status === "RETURNED" && err instanceof PayPalError && err.errorName === "ITEM_ALREADY_CANCELLED" ? "PASS" : "FAIL";
      }
    } catch (err) {
      cancelNotes.push(`real cancel failed: ${String(err)}`);
    }
  }
  if (cancelOutcome !== "PASS") {
    const ok = await client.cancelItem("POSPOI002").then((r) => r.transaction_status, (e) => String(e));
    cancelNotes.push(`POSPOI002 -> ${ok}`);
    for (const id of ["ERRPYO007", "ERRPYO008", "ERRPYO009"]) {
      const name = await client.cancelItem(id).then(() => "accepted", (e) => (e instanceof PayPalError ? e.errorName : String(e)));
      cancelNotes.push(`${id} -> ${name}`);
    }
  }
  record(5, "Cancel, then cancel again", cancelOutcome, cancelNotes.join("; "));

  // 6. Webhooks arrive and verify.
  const apiUrl = process.env.RINGFENCE_API_URL;
  if (mockWebhookEvents) {
    await new Promise((r) => setTimeout(r, 100)); // let the mock's deliveries land
    record(6, "PAYOUTS-ITEM webhooks arrive and verify", mockWebhookEvents.length > 0 ? "PASS" : "FAIL", `verified: ${[...new Set(mockWebhookEvents)].join(", ") || "none"}`);
  } else if (apiUrl && process.env.ADMIN_TOKEN) {
    const wanted = new Set([paid?.payout_batch_id, unclaimed.payout_batch_id].filter(Boolean));
    let seen: string[] = [];
    for (let i = 0; i < 20 && seen.length === 0; i++) {
      const res = await fetch(`${apiUrl}/v1/webhooks/events`, { headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` } });
      const events = (await res.json().catch(() => [])) as Array<{ event_type: string; payout_batch_id?: string }>;
      seen = events.filter((e) => e.payout_batch_id && wanted.has(e.payout_batch_id)).map((e) => e.event_type);
      if (seen.length === 0) await new Promise((r) => setTimeout(r, 15_000));
    }
    record(6, "PAYOUTS-ITEM webhooks arrive and verify", seen.length > 0 ? "PASS" : "FALLBACK", seen.length > 0 ? `verified: ${seen.join(", ")}` : "none within 5 minutes; polling stays primary");
  } else {
    record(6, "PAYOUTS-ITEM webhooks arrive and verify", "SKIP", "set RINGFENCE_API_URL and ADMIN_TOKEN to check a deployed webhook receiver");
  }

  // 7. Stay under the sandbox's 50 requests a minute: the busiest 60-second window of this run.
  let busiest = 0;
  for (let i = 0; i < requestTimes.length; i++) {
    const start = requestTimes[i] ?? 0;
    busiest = Math.max(busiest, requestTimes.filter((t) => t >= start && t < start + 60_000).length);
  }
  record(7, "Under 50 requests a minute", busiest < 50 ? "PASS" : "FAIL", `${requestTimes.length} requests, busiest minute ${busiest}`);

  await closeMock?.();
}

main()
  .then(finish)
  .catch((err) => {
    console.error(err);
    finish();
    process.exitCode = 1;
  });
