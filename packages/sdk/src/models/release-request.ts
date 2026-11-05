import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Give `sender_item_ids`, `hold_group_id`, or both. */
export type ReleaseRequest = {
  runId: string;
  senderItemIds?: string[];
  holdGroupId?: string;
  releasedBy?: string;
};

export const releaseRequestSchema: Schema<ReleaseRequest> = s.object<ReleaseRequest>({
  runId: s.string(),
  senderItemIds: s.optional(s.array(s.string())),
  holdGroupId: s.optional(s.string()),
  releasedBy: s.optional(s.string()),
  _keysMap: {
    runId: "run_id",
    senderItemIds: "sender_item_ids",
    holdGroupId: "hold_group_id",
    releasedBy: "released_by",
  },
});
