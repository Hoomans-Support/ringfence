import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { ruleConditionSchema, type RuleCondition } from "./rule-condition.js";

export type RuleWhen = {
  all: RuleCondition[];
};

export const ruleWhenSchema: Schema<RuleWhen> = s.object<RuleWhen>({
  all: s.array(s.lazy(() => ruleConditionSchema)),
});
