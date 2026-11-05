import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { actionSchema, type Action } from "./action.js";
import { ruleWhenSchema, type RuleWhen } from "./rule-when.js";

export type Rule = {
  id: string;
  action: Action;
  when: RuleWhen;
  source?: string;
};

export const ruleSchema: Schema<Rule> = s.object<Rule>({
  id: s.string(),
  action: actionSchema,
  when: ruleWhenSchema,
  source: s.optional(s.string()),
});
