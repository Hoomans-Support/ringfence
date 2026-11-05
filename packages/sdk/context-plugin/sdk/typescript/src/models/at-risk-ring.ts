import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type AtRiskRing = {
  ringId?: string;
  memberSenderItemIds?: string[];
  size?: number;
  reasons?: string[];
  louvainClusters?: number;
};

export const atRiskRingSchema: Schema<AtRiskRing> = s.object<AtRiskRing>({
  ringId: s.optional(s.string()),
  memberSenderItemIds: s.optional(s.array(s.string())),
  size: s.optional(s.int()),
  reasons: s.optional(s.array(s.string())),
  louvainClusters: s.optional(s.int()),
  _keysMap: {
    ringId: "ring_id",
    memberSenderItemIds: "member_sender_item_ids",
    louvainClusters: "louvain_clusters",
  },
});
