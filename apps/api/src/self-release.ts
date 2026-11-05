import { normalizeEmail } from "@ringfence/engine";
import { ApiError, audit, withProgram, type Db } from "./db";
import { releaseHolds } from "./holds";

export interface SoloHeldItem {
  sender_item_id: string;
  run_id: string;
  receiver: string;
  hold_group_id: string | null;
}

export async function findSoloHeld(db: Db, programId: string, runId: string, senderItemId: string): Promise<SoloHeldItem | undefined> {
  return withProgram(db, programId, async (q) => {
    const [item] = await q.query<SoloHeldItem>(
      `SELECT i.sender_item_id, i.run_id, i.receiver, i.hold_group_id
       FROM items i
       WHERE i.program_id = $1 AND i.run_id = $2 AND i.sender_item_id = $3
         AND i.state = 'held' AND i.ring_id IS NULL
         AND (i.hold_group_id IS NULL OR (
           SELECT count(*) FROM items sibling
           WHERE sibling.program_id = i.program_id AND sibling.run_id = i.run_id
             AND sibling.hold_group_id = i.hold_group_id AND sibling.state IN ('held', 'blocked')
         ) = 1)`,
      [programId, runId, senderItemId],
    );
    return item;
  });
}

export async function completeSelfRelease(db: Db, programId: string, item: SoloHeldItem, email: string) {
  const normalizedEmail = normalizeEmail(email).email;
  if (normalizedEmail !== normalizeEmail(item.receiver).email) {
    throw new ApiError(403, "PayPal email does not match the payout address");
  }
  const result = await releaseHolds(db, programId, {
    run_id: item.run_id,
    sender_item_ids: [item.sender_item_id],
    released_by: `self-service:${normalizedEmail}`,
  });
  await withProgram(db, programId, (q) => audit(q, programId, normalizedEmail, "self_released", {
    run_id: item.run_id,
    sender_item_id: item.sender_item_id,
  }));
  return result;
}
