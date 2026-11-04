/**
 * The background worker (Render: a plain worker, PRD): every WORKER_INTERVAL_MS it sends whatever
 * the outbox holds (batches the API couldn't send inline, releases, cancels) and polls PayPal for
 * every batch still waiting. Safe to run beside the API's inline sends, and as several copies:
 * outbox events are claimed with SKIP LOCKED and statuses only move forward.
 *
 *   npx tsx apps/api/src/worker.ts
 */
import { boot } from "./boot";
import { drainOutbox } from "./executor";
import { pollBatches } from "./sync";

const { db, paypal } = await boot();
const intervalMs = Number(process.env.WORKER_INTERVAL_MS ?? 15_000);
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => (stopping = true));
console.log(`worker: every ${intervalMs / 1000}s, PayPal ${process.env.PAYPAL_MODE === "sandbox" ? "sandbox" : "mock"}`);

while (!stopping) {
  try {
    const sent = await drainOutbox(db, paypal);
    const moved = await pollBatches(db, paypal);
    if (sent || moved) console.log(`worker: ${sent} outbox event(s) done, ${moved} item status(es) applied`);
  } catch (err) {
    console.error(`worker: pass failed, retrying next pass: ${String(err)}`);
  }
  for (let waited = 0; waited < intervalMs && !stopping; waited += 250) await new Promise((r) => setTimeout(r, 250));
}
await db.close();
console.log("worker: stopped");
