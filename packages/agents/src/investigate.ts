/**
 * investigate(ring, run) -> CaseFile (FR-8). Scripted, not an LLM call — see the module doc on
 * checkClaims for why that's fine. It looks only at the ring's own members and the run's data (no
 * invented facts), and writes a claim only when the evidence is common to every member it names, so
 * checkClaims (next) should confirm all of them on a correct case file.
 *
 * The real model call lives downstream, in narrate.ts's narrateClaims(): it only ever rewrites a
 * claim's `text` into nicer prose, never its `check`, so this function's own facts stay the ground
 * truth checkClaims verifies regardless of whether narration ran. Read-only, no tool that moves
 * money, exactly as FR-8 requires.
 */
import { aliasPatternKey, type PayoutItem, type PayoutRun, type RingSummary } from "@ringfence/engine";
import type { CaseFile, Claim, ProposedRule } from "./types";

function shortId(accountId: string): string {
  return accountId.replace(/^u_/, "");
}

function listAccounts(ids: string[]): string {
  if (ids.length <= 2) return ids.map(shortId).join(" and ");
  return `${ids.slice(0, -1).map(shortId).join(", ")} and ${shortId(ids[ids.length - 1] ?? "")}`;
}

function membersOf(ring: RingSummary, run: PayoutRun): PayoutItem[] {
  const bySenderItemId = new Map(run.items.map((it) => [it.sender_item_id, it] as const));
  return ring.member_sender_item_ids.map((id) => bySenderItemId.get(id)).filter((x): x is PayoutItem => Boolean(x));
}

function buildClaims(members: PayoutItem[]): Claim[] {
  const claims: Claim[] = [];
  let n = 0;
  const nextId = () => `c${++n}`;

  // Shared device: one claim per device used by 2+ members.
  const byDevice = new Map<string, PayoutItem[]>();
  for (const m of members) {
    const list = byDevice.get(m.context.device_hash);
    if (list) list.push(m);
    else byDevice.set(m.context.device_hash, [m]);
  }
  for (const [device, group] of byDevice) {
    if (group.length < 2) continue;
    const accountIds = group.map((m) => m.context.account_id);
    claims.push({
      id: nextId(),
      text: `Accounts ${listAccounts(accountIds)} used device ${device}.`,
      check: { kind: "shared_device", account_ids: accountIds, device_hash: device },
    });
  }

  // Signup window: only if every member is in one tight window (otherwise there's no single
  // claim that's true of the whole ring — a partial-window claim would need its own account list).
  if (members.length > 1) {
    const times = members.map((m) => new Date(m.context.signup_at).getTime());
    const spreadMinutes = Math.ceil((Math.max(...times) - Math.min(...times)) / 60_000);
    claims.push({
      id: nextId(),
      text: `All ${members.length} accounts signed up within ${Math.max(spreadMinutes, 1)} minutes of each other.`,
      check: {
        kind: "signup_window",
        account_ids: members.map((m) => m.context.account_id),
        window_minutes: Math.max(spreadMinutes, 1),
      },
    });
  }

  // Onboarding speed, only if true of every member.
  const maxOnboarding = Math.max(...members.map((m) => m.context.onboarding_seconds ?? Infinity));
  if (Number.isFinite(maxOnboarding)) {
    claims.push({
      id: nextId(),
      text: `All ${members.length} accounts finished onboarding in ${maxOnboarding} seconds or less.`,
      check: {
        kind: "onboarding_speed",
        account_ids: members.map((m) => m.context.account_id),
        max_onboarding_seconds: maxOnboarding,
      },
    });
  }

  // Quiet after onboarding, only if true of every member.
  if (members.every((m) => m.context.activity_after_onboarding === 0)) {
    claims.push({
      id: nextId(),
      text: `None of the ${members.length} accounts were active after onboarding.`,
      check: {
        kind: "quiet_after_onboarding",
        account_ids: members.map((m) => m.context.account_id),
        max_activity_after_onboarding: 0,
      },
    });
  }

  // Alias pattern: one claim per pattern shared by 2+ members.
  const byAlias = new Map<string, PayoutItem[]>();
  for (const m of members) {
    const key = aliasPatternKey(m.receiver);
    const list = byAlias.get(key);
    if (list) list.push(m);
    else byAlias.set(key, [m]);
  }
  for (const [key, group] of byAlias) {
    if (group.length < 2) continue;
    const accountIds = group.map((m) => m.context.account_id);
    claims.push({
      id: nextId(),
      text: `${accountIds.length} payout addresses follow the same pattern.`,
      check: { kind: "alias_pattern", account_ids: accountIds, alias_key: key },
    });
  }

  // Shared referrer, only if every member has the same one.
  const referrers = new Set(members.map((m) => m.context.referrer_id).filter(Boolean));
  if (referrers.size === 1) {
    const [referrerId] = referrers;
    if (referrerId) {
      claims.push({
        id: nextId(),
        text: `All ${members.length} accounts were referred by the same referrer.`,
        check: {
          kind: "shared_referrer",
          account_ids: members.map((m) => m.context.account_id),
          referrer_id: referrerId,
        },
      });
    }
  }

  return claims;
}

function proposeRule(ringId: string, claims: Claim[], memberCount: number): ProposedRule {
  const byKind = new Map(claims.map((c) => [c.check.kind, c.check] as const));
  const conditions: ProposedRule["when"]["all"] = [];

  const referrerCheck = byKind.get("shared_referrer");
  const windowCheck = byKind.get("signup_window");
  if (referrerCheck?.referrer_id && windowCheck?.window_minutes) {
    conditions.push({
      signal: "signup_burst",
      same: "referrer",
      window_min: windowCheck.window_minutes,
      min_accounts: memberCount,
    });
  }

  const speedCheck = byKind.get("onboarding_speed");
  if (speedCheck) {
    conditions.push({ signal: "onboarding_seconds", max: speedCheck.max_onboarding_seconds });
  }

  const quietCheck = byKind.get("quiet_after_onboarding");
  if (quietCheck) {
    conditions.push({ signal: "activity_after_onboarding", max: quietCheck.max_activity_after_onboarding });
  }

  return {
    id: `R-${ringId.replace(/^R-/, "")}`, // a rule id in the same "R-NN" space as ring ids (see types.ts)
    action: "HOLD",
    when: { all: conditions },
    source: `ring ${ringId}`,
  };
}

export function investigate(ring: RingSummary, run: PayoutRun): CaseFile {
  const members = membersOf(ring, run);
  const claims = buildClaims(members);
  return {
    ring_id: ring.ring_id,
    claims,
    proposed_rule: proposeRule(ring.ring_id, claims, members.length),
    claims_checked: { checked: 0, total: claims.length },
  };
}

