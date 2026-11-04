export { aliasPatternKey, isDisposableDomain, maskEmail, normalizeEmail } from "./identity";
export type { NormalizedEmail } from "./identity";
export { buildGraph, communityHasHardLink, detectCommunities, EDGE_THRESHOLD } from "./graph";
export type { GraphBuildResult } from "./graph";
export { scoreRun } from "./score-run";
export { backtest, evaluateRules, STARTER_RULE_SET_VERSION, STARTER_RULES, validateRule } from "./rules";
export type { BacktestResult, LabeledRun, Rule, RuleCondition, RuleContext, RuleDecision, RuleRunResult } from "./rules";
export type {
  Decision,
  ItemDecision,
  PayoutItem,
  PayoutItemContext,
  PayoutRun,
  RingSummary,
  ScoreRunContext,
  ScoreRunResult,
} from "./types";
