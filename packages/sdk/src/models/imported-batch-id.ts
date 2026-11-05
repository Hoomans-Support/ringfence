import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type ImportedBatchId = {
  payoutBatchId: string;
};

export const importedBatchIdSchema: Schema<ImportedBatchId> = s.object<ImportedBatchId>({
  payoutBatchId: s.string(),
  _keysMap: {
    payoutBatchId: "payout_batch_id",
  },
});
