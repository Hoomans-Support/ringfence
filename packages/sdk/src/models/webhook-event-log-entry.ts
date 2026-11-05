import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type WebhookEventLogEntry = {
  eventId?: string;
  eventType?: string;
  payoutBatchId?: string | null;
  transactionStatus?: string | null;
  applied?: boolean;
  receivedAt?: Date;
};

export const webhookEventLogEntrySchema: Schema<WebhookEventLogEntry> = s.object<WebhookEventLogEntry>({
  eventId: s.optional(s.string()),
  eventType: s.optional(s.string()),
  payoutBatchId: s.optionalNullable(s.string()),
  transactionStatus: s.optionalNullable(s.string()),
  applied: s.optional(s.boolean()),
  receivedAt: s.optional(s.dateTime()),
  _keysMap: {
    eventId: "event_id",
    eventType: "event_type",
    payoutBatchId: "payout_batch_id",
    transactionStatus: "transaction_status",
    receivedAt: "received_at",
  },
});
