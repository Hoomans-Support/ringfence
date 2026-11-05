import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { decisionSchema, type Decision } from "./decision.js";
import { stateSchema, type State } from "./state.js";

export type ItemDecision = {
  senderItemId?: string;
  decision?: Decision;
  state?: State;
  /** Set only for communities of 3+ */
  ringId?: string;
  /** Set for any held group, ring or pair */
  holdGroupId?: string;
  reasons?: string[];
  rules?: string[];
};

export const itemDecisionSchema: Schema<ItemDecision> = s.object<ItemDecision>({
  senderItemId: s.optional(s.string()),
  decision: s.optional(s.lazy(() => decisionSchema)),
  state: s.optional(s.lazy(() => stateSchema)),
  ringId: s.optional(s.string()),
  holdGroupId: s.optional(s.string()),
  reasons: s.optional(s.array(s.string())),
  rules: s.optional(s.array(s.string())),
  _keysMap: {
    senderItemId: "sender_item_id",
    ringId: "ring_id",
    holdGroupId: "hold_group_id",
  },
});
