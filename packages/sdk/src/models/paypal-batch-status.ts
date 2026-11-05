import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type PaypalBatchStatus = {
  senderBatchId?: string | null;
  payoutBatchId?: string | null;
  /** PayPal's own status once sent; QUEUED or NOT_SENT before that. */
  batchStatus?: string | null;
  /** PayPal's last refusal (e.g. INSUFFICIENT_FUNDS) while unsent */
  error?: string;
};

export const paypalBatchStatusSchema: Schema<PaypalBatchStatus> = s.object<PaypalBatchStatus>({
  senderBatchId: s.optionalNullable(s.string()),
  payoutBatchId: s.optionalNullable(s.string()),
  batchStatus: s.optionalNullable(s.string()),
  error: s.optional(s.string()),
  _keysMap: {
    senderBatchId: "sender_batch_id",
    payoutBatchId: "payout_batch_id",
    batchStatus: "batch_status",
  },
});
