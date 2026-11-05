import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { itemDecisionSchema, type ItemDecision } from "./item-decision.js";
import { paypalBatchStatusSchema, type PaypalBatchStatus } from "./paypal-batch-status.js";
import { runSummarySchema, type RunSummary } from "./run-summary.js";

export type RunResponse = {
  runId?: string;
  ruleSetVersion?: string;
  summary?: RunSummary;
  paypal?: PaypalBatchStatus;
  decisions?: ItemDecision[];
};

export const runResponseSchema: Schema<RunResponse> = s.object<RunResponse>({
  runId: s.optional(s.string()),
  ruleSetVersion: s.optional(s.string()),
  summary: s.optional(s.lazy(() => runSummarySchema)),
  paypal: s.optional(s.lazy(() => paypalBatchStatusSchema)),
  decisions: s.optional(s.array(s.lazy(() => itemDecisionSchema))),
  _keysMap: {
    runId: "run_id",
    ruleSetVersion: "rule_set_version",
  },
});
