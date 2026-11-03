/**
 * scoreRun (FR-3, FR-4 baseline): the graph-and-risk-flag detection layer.
 *
 * Builds the weighted graph and groups accounts by connected component —
 * everyone a surviving edge chain reaches is one group, which is what keeps
 * a ring spread across several devices as one group instead of one group
 * per device. A group is held if it carries a risk flag (onboarding_speed,
 * quiet-after-onboarding, or a disposable payout address) AND either has a
 * hard link inside it or has 3 or more members — matching final-prd.docx:
 * "A community with a risk flag is held if it has a hard link or 3 or more
 * accounts. Communities of 3 or more are labeled rings and get a case file."
 * Louvain also runs over the graph (as FR-3 asks), surfaced per ring as
 * `louvain_clusters` — a structural detail for the case file, not the hold
 * boundary (see graph.ts for why).
 *
 * This is the baseline the rule engine (A, FR-4/FR-11) layers versioned
 * starter and learned rules on top of — it is not the final word on every
 * payee (a learned rule can still hold or block something this misses), but
 * nothing here can ever turn a hold back into a pay.
 */
import { buildGraph, communityHasHardLink, connectedComponents, detectCommunities } from "./graph";
import { normalizeEmail } from "./identity";
import type { ItemDecision, PayoutItem, PayoutRun, RingSummary, ScoreRunContext, ScoreRunResult } from "./types";

const ONBOARDING_SPEED_MAX_SECONDS = 120;

function riskFlagsFor(item: PayoutItem): string[] {
  const flags: string[] = [];
  const { onboarding_seconds, activity_after_onboarding } = item.context;
  if (typeof onboarding_seconds === "number" && onboarding_seconds <= ONBOARDING_SPEED_MAX_SECONDS) {
    flags.push("onboarding_speed");
  }
  if (typeof activity_after_onboarding === "number" && activity_after_onboarding === 0) {
    flags.push("quiet_after_onboarding");
  }
  if (normalizeEmail(item.receiver).disposable) {
    flags.push("disposable_email");
  }
  return flags;
}

export function scoreRun(run: PayoutRun, _context?: ScoreRunContext): ScoreRunResult {
  const items = run.items;
  const byAccount = new Map(items.map((it) => [it.context.account_id, it] as const));

  const { graph, linkReasons } = buildGraph(items);
  const componentOf = connectedComponents(graph);
  const louvainOf = detectCommunities(graph);

  const membersByComponent = new Map<string, string[]>();
  for (const [accountId, componentId] of componentOf) {
    const list = membersByComponent.get(componentId);
    if (list) list.push(accountId);
    else membersByComponent.set(componentId, [accountId]);
  }

  const decisions: ItemDecision[] = [];
  const rings: RingSummary[] = [];
  let ringCounter = 0;
  let pairCounter = 0;

  for (const members of membersByComponent.values()) {
    const size = members.length;

    let anyRiskFlag = false;
    const flagsByAccount = new Map<string, string[]>();
    for (const accountId of members) {
      const item = byAccount.get(accountId);
      if (!item) continue;
      const flags = riskFlagsFor(item);
      flagsByAccount.set(accountId, flags);
      if (flags.length > 0) anyRiskFlag = true;
    }

    const isRingSize = size >= 3;
    const hasHardLink = size > 1 && communityHasHardLink(graph, members);
    const shouldHold = size > 1 && anyRiskFlag && (hasHardLink || isRingSize);

    let ringId: string | undefined;
    let holdGroupId: string | undefined;
    if (shouldHold) {
      if (isRingSize) {
        ringCounter += 1;
        ringId = `R-${String(ringCounter).padStart(2, "0")}`;
        holdGroupId = ringId;
      } else {
        pairCounter += 1;
        holdGroupId = `P-${String(pairCounter).padStart(2, "0")}`;
      }
    }

    const ringReasons = new Set<string>();

    for (const accountId of members) {
      const item = byAccount.get(accountId);
      if (!item) continue;

      const reasons = new Set<string>();
      if (shouldHold) {
        const linksFromAccount = linkReasons.get(accountId);
        for (const other of members) {
          if (other === accountId) continue;
          const rs = linksFromAccount?.get(other);
          rs?.forEach((r) => reasons.add(r));
        }
        flagsByAccount.get(accountId)?.forEach((f) => reasons.add(f));
      }
      reasons.forEach((r) => ringReasons.add(r));

      decisions.push({
        sender_item_id: item.sender_item_id,
        decision: shouldHold ? "HOLD" : "PAY",
        ring_id: ringId,
        hold_group_id: holdGroupId,
        reasons: [...reasons],
      });
    }

    if (ringId) {
      const louvainClusters = new Set(members.map((a) => louvainOf.get(a))).size;
      rings.push({
        ring_id: ringId,
        member_sender_item_ids: members.map((a) => byAccount.get(a)?.sender_item_id).filter((x): x is string => Boolean(x)),
        size,
        reasons: [...ringReasons],
        louvain_clusters: louvainClusters,
      });
    }
  }

  return { decisions, rings };
}
