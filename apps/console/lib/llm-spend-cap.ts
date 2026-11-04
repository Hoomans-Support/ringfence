import { createSpendCap, spendCapUsdFromEnv, type SpendCap } from "@ringfence/agents";

/**
 * One cap per running server process (not per request), so repeated page loads in a dev or demo
 * session accumulate against the same $50-by-default budget instead of each resetting to zero.
 */
let cap: SpendCap | undefined;

export function sharedLlmSpendCap(): SpendCap {
  if (!cap) cap = createSpendCap(spendCapUsdFromEnv());
  return cap;
}
