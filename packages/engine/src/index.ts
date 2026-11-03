export { aliasPatternKey, isDisposableDomain, normalizeEmail } from "./identity.js";
export type { NormalizedEmail } from "./identity.js";
export { buildGraph, communityHasHardLink, detectCommunities, EDGE_THRESHOLD } from "./graph.js";
export type { GraphBuildResult } from "./graph.js";
export { scoreRun } from "./score-run.js";
export type {
  Decision,
  ItemDecision,
  PayoutItem,
  PayoutItemContext,
  PayoutRun,
  RingSummary,
  ScoreRunContext,
  ScoreRunResult,
} from "./types.js";
