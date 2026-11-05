import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type ReleaseResponse = {
  senderBatchId?: string;
  released?: string[];
  created?: boolean;
  payoutBatchId?: string | null;
  batchStatus?: string | null;
};

export const releaseResponseSchema: Schema<ReleaseResponse> = s.object<ReleaseResponse>({
  senderBatchId: s.optional(s.string()),
  released: s.optional(s.array(s.string())),
  created: s.optional(s.boolean()),
  payoutBatchId: s.optionalNullable(s.string()),
  batchStatus: s.optionalNullable(s.string()),
  _keysMap: {
    senderBatchId: "sender_batch_id",
    payoutBatchId: "payout_batch_id",
    batchStatus: "batch_status",
  },
});
