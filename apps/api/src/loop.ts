/**
 * The worker's loop: every `intervalMs`, send whatever the outbox holds (batches the API couldn't
 * send inline, releases, cancels) and poll PayPal for every batch still waiting. Runs in its own
 * process (worker.ts) or inside the API (server.ts, RINGFENCE_INLINE_WORKER=true, which is how
 * render.yaml runs it to save a paid instance). Safe beside the API's inline sends, the cron and
 * other copies of itself: outbox events are claimed with SKIP LOCKED and statuses only move forward.
 */
import type { PayPalClient } from "@ringfence/paypal";
import type { Db } from "./db";
import { drainOutbox } from "./executor";
import { pollBatches } from "./sync";

/** Starts the loop; the returned function stops it and resolves once the current pass is done. */
export function startWorkerLoop(db: Db, paypal: PayPalClient, intervalMs = Number(process.env.WORKER_INTERVAL_MS ?? 15_000)): () => Promise<void> {
  let stopping = false;
  const done = (async () => {
    while (!stopping) {
      try {
        const sent = await drainOutbox(db, paypal);
        const moved = await pollBatches(db, paypal);
        if (sent || moved) console.log(`worker: ${sent} outbox event(s) done, ${moved} item status(es) applied`);
      } catch (err) {
        console.error(`worker: pass failed, retrying next pass: ${String(err)}`);
      }
      for (let waited = 0; waited < intervalMs && !stopping; waited += 250) await new Promise((r) => setTimeout(r, Math.min(250, intervalMs)));
    }
  })();
  return async () => {
    stopping = true;
    await done;
  };
}
