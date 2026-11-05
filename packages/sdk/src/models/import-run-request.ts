import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { payoutItemRequestSchema, type PayoutItemRequest } from "./payout-item-request.js";
import { senderBatchHeaderSchema, type SenderBatchHeader } from "./sender-batch-header.js";

export type ImportRunRequest = {
  senderBatchHeader: SenderBatchHeader;
  items: PayoutItemRequest[];
  payoutBatchId: string;
};

export const importRunRequestSchema: Schema<ImportRunRequest> = s.object<ImportRunRequest>({
  senderBatchHeader: senderBatchHeaderSchema,
  items: s.array(s.lazy(() => payoutItemRequestSchema)),
  payoutBatchId: s.string(),
  _keysMap: {
    senderBatchHeader: "sender_batch_header",
    payoutBatchId: "payout_batch_id",
  },
});
