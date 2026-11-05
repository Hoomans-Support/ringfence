import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type ApproveRuleRequest = {
  approvedBy: string;
  /** Required (true) to approve a rule that holds more than 5% of any past run. */
  acknowledgeFlags?: boolean;
};

export const approveRuleRequestSchema: Schema<ApproveRuleRequest> = s.object<ApproveRuleRequest>({
  approvedBy: s.string(),
  acknowledgeFlags: s.optional(s.boolean()),
  _keysMap: {
    approvedBy: "approved_by",
    acknowledgeFlags: "acknowledge_flags",
  },
});
