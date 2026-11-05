/**
 * The per-item state machine (FR-5). Every state change in the database is a conditional UPDATE
 * guarded by `movableFrom(to)`, so a late, replayed or out-of-order event can only move an item
 * forward, never back: a webhook saying PENDING can't undo a payout that succeeded.
 *
 * Once sent, a payout's state is its outcome in PayPal's words: succeeded, unclaimed, returned or
 * failed. "Paid" is not a state: it means a payout Ringfence let through and sent on time
 * (the run summary's count), whatever its outcome turns out to be (GLOSSARY.md).
 */
import type { ItemStatus } from "@ringfence/paypal";

export type ItemState = "held" | "blocked" | "queued" | "sent" | "succeeded" | "unclaimed" | "returned" | "failed";

const NEXT: Record<ItemState, ItemState[]> = {
  held: ["queued", "blocked"], // released into a batch of its own, or confirmed as fraud
  blocked: [],
  queued: ["sent"],
  sent: ["succeeded", "unclaimed", "returned", "failed"],
  unclaimed: ["succeeded", "returned", "failed"], // claimed, cancelled/expired, or failed
  succeeded: ["failed"], // refunded or reversed after the fact
  returned: [],
  failed: [],
};

/** States an item may be in to move to `to`, including `to` itself (re-applying is a no-op). */
export function movableFrom(to: ItemState): ItemState[] {
  return [to, ...(Object.keys(NEXT) as ItemState[]).filter((from) => NEXT[from].includes(to))];
}

/** Ringfence's state for a PayPal transaction_status. */
export function stateForPayPal(status: ItemStatus): ItemState {
  switch (status) {
    case "SUCCESS":
      return "succeeded";
    case "UNCLAIMED":
      return "unclaimed";
    case "RETURNED":
      return "returned";
    case "PENDING":
    case "ONHOLD":
      return "sent";
    default:
      return "failed"; // FAILED, BLOCKED, REFUNDED, REVERSED
  }
}
