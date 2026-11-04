/**
 * Keeping items in step with PayPal (FR-15): verified webhooks, a poller and a reconciler, all
 * applying statuses through one function, `applyItemStatus`, which only ever moves an item forward
 * (states.ts). That's what makes the three safe to run together in any order: a late webhook, a
 * redelivered one, and a poll that raced it all land on the same state.
 *
 * - Webhooks confirm. Each is verified with PayPal before anything is read from it, recorded by
 *   event id (a redelivery is acknowledged and ignored) and applied in that same transaction.
 * - Polling is primary, because sandbox webhooks can arrive late or not at all (PRD).
 * - The reconciler compares every batch with PayPal and reports what doesn't line up, rather than
 *   trusting either side to fix it silently.
 */
import type { ItemStatus, PayoutItemDetails, PayPalClient, WebhookHeaders } from "@ringfence/paypal";
import { withProgram, type Db, type Queryable } from "./db";
import { chaos } from "./executor";
import { audit } from "./runs";
import { movableFrom, stateForPayPal } from "./states";

interface BatchRow {
  sender_batch_id: string;
  program_id: string;
  payout_batch_id: string | null;
}

/** Moves one item to PayPal's status for it, if that's forward. Returns whether anything changed. */
async function applyItemStatus(q: Queryable, programId: string, senderBatchId: string, item: PayoutItemDetails): Promise<boolean> {
  const to = stateForPayPal(item.transaction_status);
  const rows = await q.query(
    `UPDATE items SET state = $4, paypal_status = $5, payout_item_id = COALESCE(payout_item_id, $6), updated_at = now()
     WHERE program_id = $1 AND batch_id = $2 AND sender_item_id = $3 AND state = ANY($7::text[])
       AND (state <> $4 OR paypal_status IS DISTINCT FROM $5 OR payout_item_id IS NULL)
     RETURNING 1`,
    [programId, senderBatchId, item.payout_item.sender_item_id, to, item.transaction_status, item.payout_item_id, movableFrom(to)],
  );
  return rows.length > 0;
}

async function findBatch(db: Db | Queryable, payoutBatchId: string | undefined, senderBatchId: string | undefined): Promise<BatchRow | undefined> {
  const [row] = await db.query<BatchRow>(
    "SELECT sender_batch_id, program_id, payout_batch_id FROM batches WHERE payout_batch_id = $1 OR (payout_batch_id IS NULL AND sender_batch_id = $2) LIMIT 1",
    [payoutBatchId ?? null, senderBatchId ?? null],
  );
  return row;
}

// A cancel's event says CANCELED but its resource already says RETURNED; the suffix is only a
// fallback for an event that carries no transaction_status.
const STATUS_FOR_EVENT: Record<string, ItemStatus> = {
  SUCCEEDED: "SUCCESS", UNCLAIMED: "UNCLAIMED", RETURNED: "RETURNED", CANCELED: "RETURNED", FAILED: "FAILED",
  DENIED: "FAILED", BLOCKED: "BLOCKED", HELD: "ONHOLD", REFUNDED: "REFUNDED", REVERSED: "REVERSED",
};

export type WebhookOutcome = "applied" | "duplicate" | "ignored" | "unverified";

export async function handleWebhook(db: Db, paypal: PayPalClient, headers: WebhookHeaders, rawBody: string): Promise<WebhookOutcome> {
  if (!(await paypal.verifyWebhook(headers, rawBody))) return "unverified";
  const event = JSON.parse(rawBody) as { id?: string; event_type?: string; resource?: Partial<PayoutItemDetails> };
  if (!event.id || !event.event_type) return "ignored";

  const resource = event.resource ?? {};
  const isItemEvent = event.event_type.startsWith("PAYMENT.PAYOUTS-ITEM.") && resource.payout_item?.sender_item_id;
  const status = resource.transaction_status ?? STATUS_FOR_EVENT[event.event_type.split(".").pop() ?? ""];
  const batch = isItemEvent ? await findBatch(db, resource.payout_batch_id, resource.sender_batch_id) : undefined;

  // Recorded first, by event id: a redelivery stops here. Recording and applying share one
  // transaction, so an event is never marked seen without its status having been applied.
  const record = async (q: Queryable) =>
    (await q.query(
      `INSERT INTO webhook_events (event_id, event_type, payout_batch_id, payout_item_id, transaction_status)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (event_id) DO NOTHING RETURNING 1`,
      [event.id, event.event_type, resource.payout_batch_id ?? null, resource.payout_item_id ?? null, status ?? null],
    )).length > 0;

  if (!batch || !status) return (await record(db)) ? "ignored" : "duplicate";
  return withProgram(db, batch.program_id, async (q) => {
    if (!(await record(q))) return "duplicate";
    const moved = await applyItemStatus(q, batch.program_id, batch.sender_batch_id, { ...resource, transaction_status: status } as PayoutItemDetails);
    if (moved) await q.query("UPDATE webhook_events SET applied = true WHERE event_id = $1", [event.id]);
    return moved ? "applied" : "ignored";
  });
}

/** Applies one PayPal batch read to our items and batch row. */
async function applyBatch(db: Db, batch: BatchRow, paypal: PayPalClient, afterFirstItem?: () => void): Promise<{ applied: number; seen: PayoutItemDetails[]; status: string }> {
  const read = await paypal.getBatch(batch.payout_batch_id as string);
  let applied = 0;
  for (const [index, item] of read.items.entries()) {
    if (await withProgram(db, batch.program_id, (q) => applyItemStatus(q, batch.program_id, batch.sender_batch_id, item))) applied += 1;
    if (index === 0) afterFirstItem?.();
  }
  await db.query("UPDATE batches SET batch_status = $2, updated_at = now() WHERE sender_batch_id = $1", [batch.sender_batch_id, read.batch_header.batch_status]);
  return { applied, seen: read.items, status: read.batch_header.batch_status };
}

/** Polls every batch that still has an item waiting on PayPal. Returns how many items moved. */
export async function pollBatches(db: Db, paypal: PayPalClient): Promise<number> {
  const batches = await db.query<BatchRow>(
    `SELECT b.sender_batch_id, b.program_id, b.payout_batch_id FROM batches b
     WHERE b.payout_batch_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM items i WHERE i.program_id = b.program_id AND i.batch_id = b.sender_batch_id AND i.state = 'sent')`,
  );
  let moved = 0;
  for (const batch of batches) {
    // The chaos CLI kills the poller after a batch's first item: the next poll must finish the rest.
    moved += (await applyBatch(db, batch, paypal, () => chaos.hook("mid_poll"))).applied;
  }
  return moved;
}

export interface ReconcileGap {
  sender_batch_id: string;
  sender_item_id?: string;
  issue: "not_at_paypal" | "unknown_to_ringfence" | "status_conflict" | "batch_never_created";
  ours?: string;
  paypal?: string;
}

/**
 * Compares every batch with PayPal: applies anything PayPal has moved forward, and reports each
 * gap — an item we sent that PayPal doesn't have, one PayPal has that we don't, a status PayPal
 * says that our state can't move to, or a batch that should exist and doesn't. Each gap also goes
 * in the audit log, so it's visible after the cron run that found it.
 */
export async function reconcile(db: Db, paypal: PayPalClient): Promise<{ batches: number; applied: number; gaps: ReconcileGap[] }> {
  const batches = await db.query<BatchRow>("SELECT sender_batch_id, program_id, payout_batch_id FROM batches ORDER BY created_at");
  const gaps: ReconcileGap[] = [];
  let applied = 0;

  for (const batch of batches) {
    if (!batch.payout_batch_id) {
      const [pending] = await db.query("SELECT 1 FROM outbox WHERE kind = 'create_batch' AND ref = $1 AND status = 'pending'", [batch.sender_batch_id]);
      if (!pending) gaps.push({ sender_batch_id: batch.sender_batch_id, issue: "batch_never_created" });
      continue;
    }
    const result = await applyBatch(db, batch, paypal);
    applied += result.applied;
    const atPayPal = new Map(result.seen.map((i) => [i.payout_item.sender_item_id, i] as const));
    const ours = await withProgram(db, batch.program_id, (q) =>
      q.query<{ sender_item_id: string; state: string }>("SELECT sender_item_id, state FROM items WHERE program_id = $1 AND batch_id = $2", [
        batch.program_id,
        batch.sender_batch_id,
      ]),
    );
    for (const item of ours) {
      const theirs = atPayPal.get(item.sender_item_id);
      atPayPal.delete(item.sender_item_id);
      if (!theirs) {
        if (item.state !== "queued") gaps.push({ sender_batch_id: batch.sender_batch_id, sender_item_id: item.sender_item_id, issue: "not_at_paypal", ours: item.state });
      } else if (item.state !== stateForPayPal(theirs.transaction_status)) {
        gaps.push({ sender_batch_id: batch.sender_batch_id, sender_item_id: item.sender_item_id, issue: "status_conflict", ours: item.state, paypal: theirs.transaction_status });
      }
    }
    for (const [senderItemId, theirs] of atPayPal) {
      gaps.push({ sender_batch_id: batch.sender_batch_id, sender_item_id: senderItemId, issue: "unknown_to_ringfence", paypal: theirs.transaction_status });
    }
  }

  for (const gap of gaps) {
    const programId = batches.find((b) => b.sender_batch_id === gap.sender_batch_id)?.program_id;
    if (programId) await withProgram(db, programId, (q) => audit(q, programId, "reconciler", "reconcile_gap", { ...gap }));
  }
  return { batches: batches.length, applied, gaps };
}
