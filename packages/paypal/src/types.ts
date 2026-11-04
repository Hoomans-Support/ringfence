/**
 * The one PayPal surface Ringfence uses (PRD, "Contracts to agree tonight"). The real client and
 * the mock both implement `PayPalClient`, so the executor, poller, smoke test and chaos CLI never
 * know which one they're talking to. Shapes are trimmed to the fields we read, named exactly as
 * the Payouts v1 OpenAPI spec names them.
 */

export interface Money {
  value: string;
  currency: string;
}

/** What actually goes to PayPal: the run's items with Ringfence's `context` block stripped. */
export interface PayoutBatchRequest {
  sender_batch_header: { sender_batch_id: string; email_subject?: string; email_message?: string };
  items: Array<{ recipient_type: "EMAIL"; receiver: string; amount: Money; sender_item_id: string; note?: string }>;
}

export type BatchStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "DENIED" | "CANCELED";
export type ItemStatus = "SUCCESS" | "FAILED" | "PENDING" | "UNCLAIMED" | "RETURNED" | "ONHOLD" | "BLOCKED" | "REFUNDED" | "REVERSED";

export interface PayoutItemDetails {
  payout_item_id: string;
  payout_batch_id: string;
  transaction_status: ItemStatus;
  sender_batch_id?: string;
  payout_item: { sender_item_id: string; receiver: string; amount: Money; note?: string };
}

export interface PayoutBatch {
  batch_header: { payout_batch_id: string; batch_status: BatchStatus; sender_batch_header: { sender_batch_id: string } };
  items: PayoutItemDetails[];
}

export interface CreateBatchResult {
  /** null only with `duplicate`: PayPal already has this batch but didn't say which one (see real.ts). */
  payout_batch_id: string | null;
  batch_status: BatchStatus | null;
  /** Set when PayPal rejected the sender_batch_id as already used: the retry did not create a
   *  second batch. The original's id comes from the error's link when PayPal sends one. */
  duplicate?: { name: string; message: string };
}

export type WebhookHeaders = Record<string, string | string[] | undefined>;

export interface PayPalClient {
  /** `requestId` goes in PayPal-Request-Id; Ringfence always passes the sender_batch_id. */
  createBatch(body: PayoutBatchRequest, requestId: string): Promise<CreateBatchResult>;
  getBatch(payoutBatchId: string): Promise<PayoutBatch>;
  getItem(payoutItemId: string): Promise<PayoutItemDetails>;
  /** Only UNCLAIMED items can be cancelled; the item comes back RETURNED. */
  cancelItem(payoutItemId: string): Promise<PayoutItemDetails>;
  verifyWebhook(headers: WebhookHeaders, rawBody: string): Promise<boolean>;
}

/** A PayPal error response, kept intact so callers can match on `name` (e.g. ITEM_ALREADY_CANCELLED). */
export class PayPalError extends Error {
  constructor(
    readonly status: number,
    readonly errorName: string,
    /** PayPal's own message, without the status/name prefix `message` carries. */
    readonly detail: string,
    readonly links: Array<{ href: string; rel?: string }> = [],
  ) {
    super(`${status} ${errorName}: ${detail}`);
    this.name = "PayPalError";
  }
}

/** PAYMENT.PAYOUTS-ITEM.* event name for a transaction status (CANCELED is sent by cancelItem itself). */
export const ITEM_EVENT_SUFFIX: Record<ItemStatus, string> = {
  SUCCESS: "SUCCEEDED",
  FAILED: "FAILED",
  PENDING: "PENDING",
  UNCLAIMED: "UNCLAIMED",
  RETURNED: "RETURNED",
  ONHOLD: "HELD",
  BLOCKED: "BLOCKED",
  REFUNDED: "REFUNDED",
  REVERSED: "REVERSED",
};
