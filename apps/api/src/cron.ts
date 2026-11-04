/**
 * The hourly cron job (PRD, Worker and cron): reconcile every batch with PayPal and log each gap,
 * then sweep unclaimed payouts that went to a confirmed ring into the cancel queue and send those
 * cancels. One pass, then exit; Render runs it on the Blueprint's schedule.
 *
 *   npx tsx apps/api/src/cron.ts
 */
import { boot } from "./boot";
import { withProgram } from "./db";
import { drainOutbox } from "./executor";
import { queueFraudCancels } from "./holds";
import { reconcile } from "./sync";

const { db, paypal } = await boot();
try {
  const report = await reconcile(db, paypal);
  let queued = 0;
  for (const { id } of await db.query<{ id: string }>("SELECT id FROM programs")) {
    queued += (await withProgram(db, id, (q) => queueFraudCancels(q, id))).queued;
  }
  const done = await drainOutbox(db, paypal);
  console.log(JSON.stringify({ reconciled_batches: report.batches, statuses_applied: report.applied, gaps: report.gaps, cancels_queued: queued, outbox_done: done }));
  if (report.gaps.length > 0) process.exitCode = 1; // a gap shows as a failed run in Render's dashboard
} finally {
  await db.close();
}
