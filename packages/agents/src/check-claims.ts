/**
 * checkClaims(caseFile, run) -> checked case file (FR-9). For every claim, re-derives the fact
 * from the cited accounts' real fields in `run` and compares it against what the claim's `check`
 * asserts — it never trusts the claim's prose or re-uses whatever investigate() already computed.
 * A claim whose cited accounts don't actually back it up comes back `checked: false` and is never
 * shown as a confirmed fact (FR-9: "unchecked claims never reach the console").
 */
import { aliasPatternKey, type PayoutItem, type PayoutRun } from "@ringfence/engine";
import type { CaseFile, Claim, ClaimCheck } from "./types";

function itemsFor(accountIds: string[], run: PayoutRun): PayoutItem[] | undefined {
  const bySenderItemId = new Map(run.items.map((it) => [it.context.account_id, it] as const));
  const items = accountIds.map((id) => bySenderItemId.get(id));
  return items.every((it): it is PayoutItem => Boolean(it)) ? items : undefined;
}

function verify(check: ClaimCheck, run: PayoutRun): boolean {
  const items = itemsFor(check.account_ids, run);
  if (!items || items.length === 0) return false;

  switch (check.kind) {
    case "shared_device":
      return check.device_hash !== undefined && items.every((it) => it.context.device_hash === check.device_hash);

    case "signup_window": {
      if (check.window_minutes === undefined) return false;
      const times = items.map((it) => new Date(it.context.signup_at).getTime());
      const spreadMinutes = (Math.max(...times) - Math.min(...times)) / 60_000;
      return spreadMinutes <= check.window_minutes;
    }

    case "onboarding_speed":
      return (
        check.max_onboarding_seconds !== undefined &&
        items.every((it) => (it.context.onboarding_seconds ?? Infinity) <= (check.max_onboarding_seconds ?? -1))
      );

    case "quiet_after_onboarding":
      return (
        check.max_activity_after_onboarding !== undefined &&
        items.every((it) => (it.context.activity_after_onboarding ?? Infinity) <= (check.max_activity_after_onboarding ?? -1))
      );

    case "alias_pattern":
      return check.alias_key !== undefined && items.every((it) => aliasPatternKey(it.receiver) === check.alias_key);

    case "shared_referrer":
      return check.referrer_id !== undefined && items.every((it) => it.context.referrer_id === check.referrer_id);

    default:
      return false;
  }
}

export function checkClaims(caseFile: CaseFile, run: PayoutRun): CaseFile {
  const claims: Claim[] = caseFile.claims.map((claim) => ({ ...claim, checked: verify(claim.check, run) }));
  const checked = claims.filter((c) => c.checked).length;

  return {
    ...caseFile,
    claims,
    claims_checked: { checked, total: claims.length },
  };
}
