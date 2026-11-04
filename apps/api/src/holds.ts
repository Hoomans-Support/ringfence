/**
 * A person's two decisions on held payees (FR-6).
 *
 * Release: the held payees move into a PayPal batch of their own, through the same outbox and
 * executor as a run, so it's exactly-once the same way. The batch id is derived from the run and
 * the exact set of payees released, so a retried release request finds its own batch instead of
 * making a second one.
 *
 * Confirm: a held ring becomes blocked, and its devices and payout addresses join this program's
 * confirmed-fraud list, which starter rule S-02 blocks on sight in every later run.
 */
import { normalizeEmail } from "@ringfence/engine";
import { ApiError, audit, sha256, withProgram, type Db } from "./db";

export interface ReleaseRequest {
  run_id: string;
  sender_item_ids?: string[];
  hold_group_id?: string;
  released_by?: string;
}

export async function releaseHolds(db: Db, programId: string, req: ReleaseRequest): Promise<{ sender_batch_id: string; released: string[]; created: boolean }> {
  if (!req.sender_item_ids?.length && !req.hold_group_id) throw new ApiError(400, "give sender_item_ids or hold_group_id");
  return withProgram(db, programId, async (q) => {
    const match = `program_id = $1 AND run_id = $2 AND (sender_item_id = ANY($3::text[]) OR hold_group_id = $4)`;
    const args = [programId, req.run_id, req.sender_item_ids ?? [], req.hold_group_id ?? null];
    const held = (await q.query<{ sender_item_id: string }>(`SELECT sender_item_id FROM items WHERE ${match} AND state = 'held' ORDER BY sender_item_id`, args)).map(
      (r) => r.sender_item_id,
    );

    if (held.length === 0) {
      // Nothing left to release: a retry of a release that already happened gets its batch back.
      const [earlier] = await q.query<{ batch_id: string }>(
        `SELECT DISTINCT i.batch_id FROM items i JOIN batches b ON b.sender_batch_id = i.batch_id
         WHERE i.program_id = $1 AND i.run_id = $2 AND (i.sender_item_id = ANY($3::text[]) OR i.hold_group_id = $4) AND b.kind = 'release'`,
        args,
      );
      if (!earlier) throw new ApiError(409, "none of those payees are on hold in this run");
      const released = await q.query<{ sender_item_id: string }>("SELECT sender_item_id FROM items WHERE program_id = $1 AND batch_id = $2 ORDER BY sender_item_id", [
        programId,
        earlier.batch_id,
      ]);
      return { sender_batch_id: earlier.batch_id, released: released.map((r) => r.sender_item_id), created: false };
    }

    const senderBatchId = `${req.run_id}-rel-${sha256(held.join(",")).slice(0, 10)}`;
    await q.query(
      "UPDATE items SET state = 'queued', batch_id = $3, updated_at = now() WHERE program_id = $1 AND sender_item_id = ANY($2::text[]) AND run_id = $4 AND state = 'held'",
      [programId, held, senderBatchId, req.run_id],
    );
    await q.query("INSERT INTO batches (sender_batch_id, program_id, run_id, kind) VALUES ($1, $2, $3, 'release')", [senderBatchId, programId, req.run_id]);
    await q.query("INSERT INTO outbox (kind, ref) VALUES ('create_batch', $1)", [senderBatchId]);
    await audit(q, programId, req.released_by ?? "api", "holds_released", { run_id: req.run_id, sender_batch_id: senderBatchId, sender_item_ids: held });
    return { sender_batch_id: senderBatchId, released: held, created: true };
  });
}

export async function confirmRing(
  db: Db,
  programId: string,
  ringId: string,
  req: { run_id: string; confirmed_by?: string },
): Promise<{ ring_id: string; blocked: number; devices: number; payout_addresses: number }> {
  return withProgram(db, programId, async (q) => {
    const members = await q.query<{ sender_item_id: string; receiver: string; device: string; state: string }>(
      `SELECT sender_item_id, receiver, context->>'device_hash' AS device, state FROM items
       WHERE program_id = $1 AND run_id = $2 AND (ring_id = $3 OR hold_group_id = $3) AND state IN ('held', 'blocked')`,
      [programId, req.run_id, ringId],
    );
    if (members.length === 0) throw new ApiError(404, `no held payees under ${ringId} in run ${req.run_id}`);

    const blocked = await q.query(
      `UPDATE items SET state = 'blocked', updated_at = now()
       WHERE program_id = $1 AND run_id = $2 AND (ring_id = $3 OR hold_group_id = $3) AND state = 'held' RETURNING 1`,
      [programId, req.run_id, ringId],
    );
    const devices = [...new Set(members.map((m) => m.device))];
    const addresses = [...new Set(members.map((m) => normalizeEmail(m.receiver).email))];
    await q.query(
      `INSERT INTO known_fraud (program_id, kind, value, ring_id, run_id)
       SELECT $1, v.kind, v.value, $2, $3 FROM jsonb_to_recordset($4::jsonb) AS v(kind text, value text)
       ON CONFLICT DO NOTHING`,
      [programId, ringId, req.run_id, JSON.stringify([...devices.map((value) => ({ kind: "device", value })), ...addresses.map((value) => ({ kind: "payout_address", value }))])],
    );
    await audit(q, programId, req.confirmed_by ?? "api", "ring_confirmed", { run_id: req.run_id, ring_id: ringId, blocked: blocked.length, devices: devices.length });
    return { ring_id: ringId, blocked: blocked.length, devices: devices.length, payout_addresses: addresses.length };
  });
}
