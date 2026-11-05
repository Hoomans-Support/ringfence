/**
 * Data for the hold calendar (apps/console/app/review/calendar): one Bryntum Scheduler row per
 * held group (ring or pair), one event bar spanning from the group's earliest sign-up to its
 * 7-day hold expiry (the same formula review/page.tsx uses for its own holdExpiresAt column).
 *
 * Computed independently rather than sharing a helper with review/page.tsx: this duplicates the
 * same week-0/week-2 decision-override logic already duplicated between review/page.tsx and
 * control-tower/page.tsx (a known, deferred issue - the internal notes doc that used to track it
 * was removed before public submission, so this comment is now the only record of it), but
 * refactoring the already-shipped, screenshot-verified review queue this close to the deadline is
 * a bigger risk than one more small copy of it.
 */
import { applyRule } from "@ringfence/agents";
import { scoreRun, type ItemDecision, type RingSummary } from "@ringfence/engine";
import { loadWeekRun, loadWeekTruth, type DemoWeek } from "./fixtures";
import { buildR12Learning } from "./learned-rule";

const HOLD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface CalendarResource {
  id: string;
  name: string;
}

export interface CalendarEvent {
  id: string;
  resourceId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export function buildHoldCalendarData(week: DemoWeek, adjusted = false): { resources: CalendarResource[]; events: CalendarEvent[] } {
  const outcomeWeek: DemoWeek = week === 2 ? 1 : week;
  const run = loadWeekRun(outcomeWeek);
  const truth = loadWeekTruth(outcomeWeek);
  const { decisions, rings } = scoreRun(run);
  const learning = week >= 2 ? buildR12Learning(loadWeekRun(1), loadWeekTruth(1)) : null;
  const rule = learning ? (adjusted && learning.revised ? learning.revised : learning.rule) : null;
  const ruleMatches = week === 3 && rule ? new Set(applyRule(rule, run)) : new Set<string>();
  const networkMatches = week === 4 ? new Set(loadWeekTruth(4).filter((label) => label.group === "ring_match").map((label) => label.sender_item_id)) : new Set<string>();
  const effectiveDecisions: ItemDecision[] = week === 0
    ? decisions.map((d) => ({ ...d, decision: "PAY" }))
    : week === 3
      ? decisions.map((d) => ruleMatches.has(d.sender_item_id) ? { ...d, decision: "HOLD", ring_id: undefined, hold_group_id: `rule:${rule?.id ?? "R-07"}` } : d)
      : week === 4
        ? decisions.map((d) => networkMatches.has(d.sender_item_id) ? { ...d, decision: "HOLD", ring_id: undefined, hold_group_id: "network:R-12" } : d)
        : decisions;

  const accountBySenderItemId = new Map(run.items.map((item) => [item.sender_item_id, item.context.account_id]));
  function narrativeLabel(ringId: string | undefined, memberSenderItemIds: string[]): string | undefined {
    if (!ringId) return undefined;
    const memberAccountIds = new Set(
      memberSenderItemIds.map((id) => accountBySenderItemId.get(id)).filter((x): x is string => Boolean(x)),
    );
    return truth.find((t) => memberAccountIds.has(t.account_id) && t.ring_label)?.ring_label ?? ringId;
  }
  const ringLabelById = new Map((week === 4 ? [] : rings).map((r: RingSummary) => [r.ring_id, narrativeLabel(r.ring_id, r.member_sender_item_ids)]));

  const itemById = new Map(run.items.map((item) => [item.sender_item_id, item]));
  const held = effectiveDecisions.filter((d) => d.decision === "HOLD");

  const signupsByGroup = new Map<string, number[]>();
  for (const d of held) {
    const item = itemById.get(d.sender_item_id);
    if (!item) continue;
    const group = d.ring_id ? (ringLabelById.get(d.ring_id) ?? d.ring_id) : (d.hold_group_id ?? "—");
    const signupMs = new Date(item.context.signup_at).getTime();
    const list = signupsByGroup.get(group);
    if (list) list.push(signupMs);
    else signupsByGroup.set(group, [signupMs]);
  }

  const events: CalendarEvent[] = [...signupsByGroup].map(([group, signups]) => {
    const earliestSignup = Math.min(...signups);
    return {
      id: group,
      resourceId: group,
      name: signups.length === 1 ? "1 account" : `${signups.length} accounts`,
      startDate: new Date(earliestSignup).toISOString(),
      endDate: new Date(earliestSignup + HOLD_WINDOW_MS).toISOString(),
    };
  });
  // Soonest-expiring group first, so the most time-sensitive hold is the top row.
  events.sort((a, b) => a.endDate.localeCompare(b.endDate));
  const resources: CalendarResource[] = events.map((e) => ({ id: e.resourceId, name: e.resourceId }));

  return { resources, events };
}
