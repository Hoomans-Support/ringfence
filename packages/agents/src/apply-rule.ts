import type { PayoutItem, PayoutRun } from "@ringfence/engine";
import type { ProposedRule, RuleCondition } from "./types";

function signupBurstMatches(condition: RuleCondition, items: PayoutItem[]): Set<string> {
  const matches = new Set<string>();
  if (condition.same !== "referrer" || condition.window_min === undefined || condition.min_accounts === undefined) return matches;
  const byReferrer = new Map<string, PayoutItem[]>();
  for (const item of items) {
    const referrer = item.context.referrer_id;
    if (!referrer) continue;
    const group = byReferrer.get(referrer) ?? [];
    group.push(item);
    byReferrer.set(referrer, group);
  }

  const windowMs = condition.window_min * 60_000;
  for (const group of byReferrer.values()) {
    const sorted = [...group].sort((a, b) => Date.parse(a.context.signup_at) - Date.parse(b.context.signup_at));
    let start = 0;
    for (let end = 0; end < sorted.length; end++) {
      const current = sorted[end];
      if (!current) continue;
      while (start < end) {
        const first = sorted[start];
        if (!first || Date.parse(current.context.signup_at) - Date.parse(first.context.signup_at) <= windowMs) break;
        start++;
      }
      if (end - start + 1 < condition.min_accounts) continue;
      for (let index = start; index <= end; index++) {
        const member = sorted[index];
        if (member) matches.add(member.sender_item_id);
      }
    }
  }
  return matches;
}

function passes(rule: ProposedRule, item: PayoutItem, burstMatches: Map<RuleCondition, Set<string>>): boolean {
  return rule.when.all.every((condition) => {
    switch (condition.signal) {
      case "signup_burst":
        return burstMatches.get(condition)?.has(item.sender_item_id) ?? true;
      case "onboarding_seconds":
        return condition.max === undefined || (item.context.onboarding_seconds !== undefined && item.context.onboarding_seconds <= condition.max);
      case "activity_after_onboarding":
        return condition.max === undefined || (item.context.activity_after_onboarding !== undefined && item.context.activity_after_onboarding <= condition.max);
      default:
        return true;
    }
  });
}

/** Apply an investigator rule to a payout run using its observed item context. */
export function applyRule(rule: ProposedRule, run: PayoutRun): string[] {
  const burstMatches = new Map<RuleCondition, Set<string>>();
  for (const condition of rule.when.all) {
    if (condition.signal === "signup_burst") burstMatches.set(condition, signupBurstMatches(condition, run.items));
  }
  return run.items.filter((item) => passes(rule, item, burstMatches)).map((item) => item.sender_item_id);
}
