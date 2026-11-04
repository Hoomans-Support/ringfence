/**
 * The red-team-misses feedback loop (FR-13, task 7's follow-on): a rule's non-held-out misses
 * (`ProposedRule.red_team.open_misses`) become saved `RedTeamCase`s, the next proposal for that
 * ring widens whichever threshold a majority of its open cases beat (see investigate.ts), and
 * whichever cases the revision now catches close and join the permanent record. That's what makes
 * a rule "smarter than the last" rather than a one-off check: every miss turns into a future test.
 *
 * No persistence layer here — the console has no live write path today, so these are pure functions
 * over whatever case list the caller already has (computed live from the Week 1 fixture on each
 * request, same as the rest of the demo). Both functions return a new array rather than mutating
 * their input, matching redTeamRule's convention in attack-rule.ts.
 */
import { caughtBy, failingSignals } from "./attack-rule";
import type { ProposedRule, RedTeamCase } from "./types";

/** Turns `rule`'s fresh `red_team.open_misses` into new saved cases, appended after whatever
 *  `priorCases` already held (so closed cases from earlier rounds stay in the record). An attempt
 *  that's already saved — same `id`, from an earlier call with the same rule — isn't saved twice. */
export function recordOpenCases(priorCases: RedTeamCase[], rule: ProposedRule): RedTeamCase[] {
  const openMisses = rule.red_team?.open_misses ?? [];
  const alreadySaved = new Set(priorCases.map((c) => c.id));

  const fresh: RedTeamCase[] = openMisses
    .filter((attempt) => !alreadySaved.has(attempt.id))
    .map((attempt) => ({
      id: attempt.id,
      missedByRuleId: rule.id,
      attempt,
      failedSignals: failingSignals(rule, attempt),
      status: "open" as const,
    }));

  return [...priorCases, ...fresh];
}

/** Replays every still-open case's saved attempt against `revisedRule` (via `caughtBy`, not a fresh
 *  attackRule run — the whole point is asking whether *this exact disguise* would now be caught).
 *  Whichever it catches, closes. Cases that beat only a categorical axis (`signup_burst:referrer`,
 *  which has no numeric fix) are expected to stay open — that's the honest outcome the spec calls
 *  for, not a bug. */
export function closeCaughtCases(cases: RedTeamCase[], revisedRule: ProposedRule): RedTeamCase[] {
  return cases.map((c) => {
    if (c.status === "closed") return c;
    if (!caughtBy(revisedRule, c.attempt)) return c;
    return { ...c, status: "closed", closedByRuleId: revisedRule.id };
  });
}
