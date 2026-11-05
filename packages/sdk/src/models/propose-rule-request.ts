import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { ruleSchema, type Rule } from "./rule.js";

export type ProposeRuleRequest = {
  rule: Rule;
  source?: string;
};

export const proposeRuleRequestSchema: Schema<ProposeRuleRequest> = s.object<ProposeRuleRequest>({
  rule: ruleSchema,
  source: s.optional(s.string()),
});
