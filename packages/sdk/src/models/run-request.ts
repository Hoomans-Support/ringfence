import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { payoutItemRequestSchema, type PayoutItemRequest } from "./payout-item-request.js";
import { senderBatchHeaderSchema, type SenderBatchHeader } from "./sender-batch-header.js";

export type RunRequest = {
  senderBatchHeader: SenderBatchHeader;
  items: PayoutItemRequest[];
};

export const runRequestSchema: Schema<RunRequest> = s.object<RunRequest>({
  senderBatchHeader: senderBatchHeaderSchema,
  items: s.array(s.lazy(() => payoutItemRequestSchema)),
  _keysMap: {
    senderBatchHeader: "sender_batch_header",
  },
});
