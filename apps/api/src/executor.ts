/**
 * The payout executor (FR-5): the only code that calls PayPal's money endpoints, and only for
 * items the rule engine marked PAY or a person released (both arrive here as `queued` items in a
 * batch the outbox points at).
 *
 * Exactly once, step by step (PRD, System design):
 * 1. runs.ts committed the decision and the outbox event together.
 * 2. drainOutbox claims one event with a lease (SKIP LOCKED, so the API's inline drain and the
 *    worker never work the same event at once) and sends the batch, with the sender_batch_id as
 *    both the batch id and the PayPal-Request-Id.
 * 3. If the process dies before PayPal's reply is saved, the lease expires and the retry sends the
 *    identical request: PayPal replays the original response or rejects the duplicate batch id
 *    (recovered to the original batch by the client), so nobody is paid twice.
 * 4. PayPal's batch id, the items' move to `sent` and the event's `done` are saved in one
 *    transaction, so there is no point at which half of that is recorded.
 *
 * `chaos.hook(point)` marks the places the chaos CLI kills the process (RINGFENCE_CRASH_AT).
 */
import type { PayoutBatchRequest, PayPalClient } from "@ringfence/paypal";
import { withProgram, type Db } from "./db";
import { audit } from "./runs";

export const chaos = {
  hook(point: string): void {
    if (process.env.RINGFENCE_CRASH_AT === point) {
      console.error(`chaos: killing process at ${point}`);
      process.kill(process.pid, "SIGKILL");
    }
  },
};

export interface DrainOptions {
  /** Only this event ref (a sender_batch_id): the API's inline send of the run it just recorded. */
  only?: string;
  leaseSeconds?: number;
  maxAttempts?: number;
}

interface OutboxEvent {
  id: string;
  kind: "create_batch" | "cancel_item";
  ref: string;
  attempts: number;
}

async function claim(db: Db, leaseSeconds: number, only: string | undefined): Promise<OutboxEvent | undefined> {
  const [event] = await db.query<OutboxEvent>(
    `UPDATE outbox SET attempts = attempts + 1, locked_until = now() + make_interval(secs => $1)
     WHERE id = (
       SELECT id FROM outbox
       WHERE status = 'pending' AND (locked_until IS NULL OR locked_until <= now()) AND ($2::text IS NULL OR ref = $2)
       ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
     RETURNING id, kind, ref, attempts`,
    [leaseSeconds, only ?? null],
  );
  return event;
}

async function sendBatch(db: Db, paypal: PayPalClient, event: OutboxEvent): Promise<void> {
  const [batch] = await db.query<{ program_id: string; payout_batch_id: string | null }>(
    "SELECT program_id, payout_batch_id FROM batches WHERE sender_batch_id = $1",
    [event.ref],
  );
  if (!batch) throw new Error(`outbox ${event.id}: no batch ${event.ref}`);

  const items = await withProgram(db, batch.program_id, (q) =>
    q.query<{ sender_item_id: string; receiver: string; amount_value: string; currency: string; email_subject: string | null }>(
      `SELECT i.sender_item_id, i.receiver, i.amount_value, i.currency, r.email_subject
       FROM items i JOIN runs r USING (program_id, run_id)
       WHERE i.program_id = $1 AND i.batch_id = $2 AND i.state = 'queued' ORDER BY i.sender_item_id`,
      [batch.program_id, event.ref],
    ),
  );

  let result: { payout_batch_id: string | null; batch_status: string | null } = { payout_batch_id: batch.payout_batch_id, batch_status: null };
  if (!batch.payout_batch_id && items.length > 0) {
    // Same items, same order, same ids on every attempt: a retry is byte-for-byte the first request.
    const body: PayoutBatchRequest = {
      sender_batch_header: { sender_batch_id: event.ref, email_subject: items[0]?.email_subject ?? undefined },
      items: items.map((i) => ({
        recipient_type: "EMAIL",
        receiver: i.receiver,
        amount: { value: i.amount_value, currency: i.currency },
        sender_item_id: i.sender_item_id,
      })),
    };
    const created = await paypal.createBatch(body, event.ref);
    chaos.hook("after_paypal");
    result = created;
  }

  await withProgram(db, batch.program_id, async (q) => {
    if (result.payout_batch_id) {
      await q.query("UPDATE batches SET payout_batch_id = $2, batch_status = COALESCE($3, batch_status), updated_at = now() WHERE sender_batch_id = $1", [
        event.ref,
        result.payout_batch_id,
        result.batch_status,
      ]);
      await q.query(
        "UPDATE items SET state = 'sent', paypal_status = 'PENDING', updated_at = now() WHERE program_id = $1 AND batch_id = $2 AND state = 'queued'",
        [batch.program_id, event.ref],
      );
    }
    await q.query("UPDATE outbox SET status = 'done', done_at = now(), last_error = NULL WHERE id = $1", [event.id]);
    await audit(q, batch.program_id, "executor", "batch_sent", { sender_batch_id: event.ref, payout_batch_id: result.payout_batch_id, items: items.length });
  });
}

/** Works the outbox until it's empty (or just `only`). Returns how many events it completed. */
export async function drainOutbox(db: Db, paypal: PayPalClient, opts: DrainOptions = {}): Promise<number> {
  const leaseSeconds = opts.leaseSeconds ?? 30;
  const maxAttempts = opts.maxAttempts ?? 8;
  let done = 0;
  for (;;) {
    const event = await claim(db, leaseSeconds, opts.only);
    if (!event) return done;
    chaos.hook("after_claim");
    try {
      if (event.kind !== "create_batch") throw new Error(`outbox kind ${event.kind} is not handled yet`);
      await sendBatch(db, paypal, event);
      done += 1;
    } catch (err) {
      // A simulated crash leaves the database exactly as a killed process would: untouched.
      if ((err as Error).name === "ChaosCrash") throw err;
      const backoffSeconds = Math.min(2 ** event.attempts, 600);
      await db.query(
        `UPDATE outbox SET last_error = $2, locked_until = now() + make_interval(secs => $3),
                status = CASE WHEN attempts >= $4 THEN 'failed' ELSE 'pending' END
         WHERE id = $1`,
        [event.id, String(err), backoffSeconds, maxAttempts],
      );
      console.error(`outbox ${event.id} (${event.kind} ${event.ref}) attempt ${event.attempts} failed: ${String(err)}`);
      if (opts.only) throw err;
    }
  }
}
