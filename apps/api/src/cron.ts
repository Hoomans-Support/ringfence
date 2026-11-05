/**
 * The hourly cron job (PRD, Worker and cron): put batch sends that ran out of retries back in the
 * queue (e.g. after the PayPal balance is topped up) and send, then reconcile every batch with
 * PayPal and log each remaining gap, then sweep unclaimed payouts that went to a confirmed ring
 * into the cancel queue. Retry runs before reconcile so a send that self-heals this pass doesn't
 * still get logged as a gap and fail the run. One pass, then exit; Render runs it on the
 * Blueprint's schedule.
 *
 *   npx tsx apps/api/src/cron.ts
 */
import { boot } from "./boot";
import { withProgram } from "./db";
import { drainOutbox, requeueFailedSends } from "./executor";
import { queueFraudCancels } from "./holds";
import { reconcile } from "./sync";

const { db, paypal } = await boot();
try {
  const requeued = await requeueFailedSends(db);
  const done = await drainOutbox(db, paypal);
  const report = await reconcile(db, paypal);
  let queued = 0;
  for (const { id } of await db.query<{ id: string }>("SELECT id FROM programs")) {
    queued += (await withProgram(db, id, (q) => queueFraudCancels(q, id))).queued;
  }
  console.log(JSON.stringify({ reconciled_batches: report.batches, statuses_applied: report.applied, gaps: report.gaps, cancels_queued: queued, sends_requeued: requeued, outbox_done: done }));
  if (report.gaps.length > 0) process.exitCode = 1; // a gap shows as a failed run in Render's dashboard
} finally {
  await db.close();
}
