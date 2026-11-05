import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { sameSchema, type Same } from "./same.js";
import { signalSchema, type Signal } from "./signal.js";

export type RuleCondition = {
  /**
   * `network_match` also exists but is a fixed starter signal (S-03) only, never proposable — a
   * proposed rule naming it fails the schema check as an unknown signal.
   */
  signal: Signal;
  same?: Same;
  windowMin?: number;
  minAccounts?: number;
  max?: number;
  min?: number;
};

export const ruleConditionSchema: Schema<RuleCondition> = s.object<RuleCondition>({
  signal: signalSchema,
  same: s.optional(s.lazy(() => sameSchema)),
  windowMin: s.optional(s.float64()),
  minAccounts: s.optional(s.float64()),
  max: s.optional(s.float64()),
  min: s.optional(s.float64()),
  _keysMap: {
    windowMin: "window_min",
    minAccounts: "min_accounts",
  },
});
