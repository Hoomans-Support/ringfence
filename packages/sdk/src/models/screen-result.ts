import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { itemDecisionSchema, type ItemDecision } from "./item-decision.js";
import { screenSummarySchema, type ScreenSummary } from "./screen-summary.js";

export type ScreenResult = {
  ruleSetVersion?: string;
  summary?: ScreenSummary;
  decisions?: ItemDecision[];
};

export const screenResultSchema: Schema<ScreenResult> = s.object<ScreenResult>({
  ruleSetVersion: s.optional(s.string()),
  summary: s.optional(s.lazy(() => screenSummarySchema)),
  decisions: s.optional(s.array(s.lazy(() => itemDecisionSchema))),
  _keysMap: {
    ruleSetVersion: "rule_set_version",
  },
});
