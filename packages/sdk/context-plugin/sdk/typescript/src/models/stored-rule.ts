import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { backtestResultSchema, type BacktestResult } from "./backtest-result.js";
import { redTeamResultSchema, type RedTeamResult } from "./red-team-result.js";
import { ruleSchema, type Rule } from "./rule.js";
import { statusSchema, type Status } from "./status.js";

export type StoredRule = {
  ruleId?: string;
  version?: number;
  body?: Rule;
  source?: string | null;
  status?: Status;
  backtest?: BacktestResult | null;
  redTeam?: RedTeamResult | null;
  /** e.g. "holds_over_5_percent" — needs `acknowledge_flags` to approve. */
  flags?: string[];
  approvedBy?: string | null;
  approvedAt?: Date | null;
};

export const storedRuleSchema: Schema<StoredRule> = s.object<StoredRule>({
  ruleId: s.optional(s.string()),
  version: s.optional(s.int()),
  body: s.optional(s.lazy(() => ruleSchema)),
  source: s.optionalNullable(s.string()),
  status: s.optional(s.lazy(() => statusSchema)),
  backtest: s.optionalNullable(s.lazy(() => backtestResultSchema)),
  redTeam: s.optionalNullable(s.lazy(() => redTeamResultSchema)),
  flags: s.optional(s.array(s.string())),
  approvedBy: s.optionalNullable(s.string()),
  approvedAt: s.optionalNullable(s.dateTime()),
  _keysMap: {
    ruleId: "rule_id",
    redTeam: "red_team",
    approvedBy: "approved_by",
    approvedAt: "approved_at",
  },
});
