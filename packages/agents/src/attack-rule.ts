/**
 * attackRule(rule) -> red-team result (FR-13). Generates disguised copies of the ring that
 * produced `rule` and scores the rule against each one, 50 of the 200 held out. "Disguised" means
 * each copy independently rolls a strength (0 = an exact replica of the original ring, barely
 * trying; 1 = fully committed to blending in) and, scaled by that strength, pushes each signal the
 * rule checks away from the ring's true baseline: how many minutes its signups actually spread
 * over, how many seconds onboarding actually took, how many actions it actually took after
 * onboarding — the same moves a real ring would make to dodge a rule built from its own, most
 * obviously synchronized behaviour. A rule catches a copy only if every one of its conditions'
 * simulated values still falls inside the rule's threshold (the same AND a real rule evaluator
 * would apply). Seeded from the rule's own id, so "Reset demo" reproduces the same 200 attacks and
 * the same score every time.
 *
 * No LLM needed here either, for the same reason as investigate()/checkClaims(): the rule's own
 * conditions are a JSON schema this can evaluate directly, so there is no prose to generate or
 * verify. Scores only the three signal types our investigate() actually produces (signup_burst,
 * onboarding_seconds, activity_after_onboarding); an unrecognized signal is treated as satisfied
 * rather than failing the match, so a future rule shape doesn't silently zero out every score.
 *
 * Each axis has its own cost-to-fake coefficient (how much one unit of strength pushes that axis's
 * simulated value away from the ring's baseline) rather than one shared rate, because the four
 * signals aren't equally cheap to disguise: swapping referrers or spreading out signup timing costs
 * nothing; faking genuine-looking post-onboarding activity is the hardest to fully fabricate.
 *
 * `same_referrer` is categorical (matched or didn't), so it stays a straight coin flip. The other
 * three are drawn by `evadedValue`: the same coin decides whether this attempt evades on that axis
 * at all (so an *unrevised* rule — whose threshold is the baseline, by construction — catches the
 * same share of attempts as the old pure-boolean model did), and only an evader draws a genuine
 * continuous overshoot past the baseline (a window ceiling for signup spread and onboarding time,
 * since the ring's baseline there is always positive; a small fixed ceiling for post-onboarding
 * activity, since investigate() only ever proposes that condition when the ring's true baseline was
 * exactly 0). Carrying a real overshoot rather than a pre-baked pass/fail boolean is what lets a
 * revised rule's *wider threshold* actually catch a disguise it previously missed, and only the ones
 * that didn't push too far past it: a boolean model can't tell "evaded by a little" from "evaded by
 * a lot", so a wider net could never catch some evaders of an axis and not others.
 *
 * The baseline a disguise is generated against is the ring's *true* observed stats (`rule.baseline`
 * when the rule carries one, set by investigate() and copied unchanged through every revision —
 * see its module doc), never the current rule's own threshold. Those two are the same number for a
 * freshly proposed rule (by construction) but diverge the moment a revision widens one, and the
 * simulation would be meaningless if widening the rule being tested also widened what a disguise is
 * generated relative to. A hand-built rule with no `baseline` falls back to reading its own
 * thresholds as the baseline, which is only correct for an unrevised rule — fine for tests, wrong
 * for anything that's gone through reviseRule (investigate.ts).
 *
 * The non-held-out misses (`open_misses`) are the raw material for the learning loop
 * (red-team-cases.ts): each one is a full `DisguiseAttempt`, not just an id, so it can be replayed
 * against a *different* rule later (a revised rule reseeds this PRNG under a new id and would
 * otherwise generate a completely different 200 copies — a saved case has to carry its own
 * simulated values to survive that).
 */
import type { DisguiseAttempt, ProposedRule, RuleBaseline, RuleCondition } from "./types";

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Tiny seeded PRNG (mulberry32) — deterministic, not cryptographic. Mirrors scripts/demo-generator's
 *  Rng; duplicated rather than shared because a script and a package depending on each other would
 *  run the wrong direction, and it's 15 lines. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How much one unit of disguise strength pushes an axis's simulated value away from the ring's
 *  true baseline. Higher = cheaper to fake. `min_accounts` isn't listed: a disguised copy always
 *  matches the original ring's size, so that clause never varies. */
const EVASION_COST = {
  referrer: 0.9,
  window: 1,
  onboarding: 0.6,
  activity: 0.4,
} as const satisfies Record<string, number>;

/** `activity_after_onboarding`'s baseline is always exactly 0 (investigate.ts only ever proposes
 *  the condition when every member stayed quiet), so an evading attempt's overshoot is measured off
 *  this fixed ceiling instead of off the baseline itself — this is what gives a widened max of
 *  0 -> 1 -> 2… something real to bite on. */
const ACTIVITY_CEILING = 4;

/** Draws whether this attempt evades on `axis` — same coin as the original model (more strength
 *  and a cheaper axis make evasion more likely) — and, only if it does, how far past the baseline it
 *  pushed, uniformly up to `ceiling` past it. An attempt that doesn't evade sits exactly at the
 *  baseline: always caught by an *unrevised* rule's own threshold (the baseline and the threshold
 *  are the same number there), which keeps this model's aggregate catch rate the same as the old
 *  boolean one. The difference only shows up for evaders, and only once a revision changes the
 *  threshold they're compared against: a boolean model could never tell "evaded by a little" from
 *  "evaded by a lot", so a wider net could never catch some evaders and not others. This can. */
function evadedValue(next: () => number, strength: number, axis: keyof typeof EVASION_COST, baseline: number, ceiling: number): number {
  const evades = next() <= strength * EVASION_COST[axis];
  return evades ? baseline + next() * ceiling : baseline;
}

/** A reasonable fallback for a signal whose baseline is missing because the rule being tested
 *  doesn't check it (no condition means passesCondition never reads the generated value anyway). */
function deriveBaseline(rule: ProposedRule): RuleBaseline {
  if (rule.baseline) return rule.baseline;
  const byCondition = new Map(rule.when.all.map((c) => [c.signal, c] as const));
  return {
    window_min: byCondition.get("signup_burst")?.window_min,
    onboarding_seconds: byCondition.get("onboarding_seconds")?.max,
    activity_after_onboarding: byCondition.get("activity_after_onboarding")?.max,
  };
}

function passesCondition(condition: RuleCondition, a: DisguiseAttempt): boolean {
  switch (condition.signal) {
    case "signup_burst":
      if (condition.same === "referrer" && !a.same_referrer) return false;
      if (condition.window_min !== undefined && a.signup_spread_minutes > condition.window_min) return false;
      return true;
    case "onboarding_seconds":
      return condition.max === undefined || a.onboarding_seconds <= condition.max;
    case "activity_after_onboarding":
      return condition.max === undefined || a.activity_after_onboarding <= condition.max;
    default:
      return true;
  }
}

export function caughtBy(rule: ProposedRule, a: DisguiseAttempt): boolean {
  return rule.when.all.every((c) => passesCondition(c, a));
}

/** Which of `rule`'s own conditions this attempt beat — i.e. where `passesCondition` is false.
 *  Splits `signup_burst` into its two independent sub-checks (same referrer, within window) since
 *  a disguise can beat one without the other. Used to decide what a revised rule should widen
 *  (red-team-cases.ts) and to show a saved case's own story on the rules page. */
export function failingSignals(rule: ProposedRule, a: DisguiseAttempt): string[] {
  const failed: string[] = [];
  for (const c of rule.when.all) {
    if (c.signal === "signup_burst") {
      if (c.same === "referrer" && !a.same_referrer) failed.push("signup_burst:referrer");
      if (c.window_min !== undefined && a.signup_spread_minutes > c.window_min) failed.push("signup_burst:window");
    } else if (c.signal === "onboarding_seconds" && c.max !== undefined && a.onboarding_seconds > c.max) {
      failed.push("onboarding_seconds");
    } else if (c.signal === "activity_after_onboarding" && c.max !== undefined && a.activity_after_onboarding > c.max) {
      failed.push("activity_after_onboarding");
    }
  }
  return failed;
}

export type RedTeamResult = NonNullable<ProposedRule["red_team"]>;

export function attackRule(rule: ProposedRule, variantCount = 200, heldOutCount = 50): RedTeamResult {
  const next = mulberry32(hashSeed(rule.id));
  const baseline = deriveBaseline(rule);
  const windowBaseline = baseline.window_min ?? 1;
  const onboardingBaseline = baseline.onboarding_seconds ?? 60;

  let caught = 0;
  let held_out_caught = 0;
  const misses: string[] = [];
  const open_misses: DisguiseAttempt[] = [];

  for (let i = 0; i < variantCount; i++) {
    const held_out = i >= variantCount - heldOutCount;
    const strength = next(); // 0 = barely trying, 1 = fully committed to blending in
    const attempt: DisguiseAttempt = {
      id: `${rule.id}-v${i + 1}`,
      held_out,
      same_referrer: next() > strength * EVASION_COST.referrer,
      signup_spread_minutes: evadedValue(next, strength, "window", windowBaseline, windowBaseline),
      onboarding_seconds: evadedValue(next, strength, "onboarding", onboardingBaseline, onboardingBaseline),
      activity_after_onboarding: evadedValue(next, strength, "activity", 0, ACTIVITY_CEILING),
    };

    if (caughtBy(rule, attempt)) {
      caught++;
      if (held_out) held_out_caught++;
    } else {
      misses.push(attempt.id);
      // Held-out misses never become open cases — they must stay invisible to the next rule
      // proposal, or a revision's held-out score would just be measuring memorisation.
      if (!held_out) open_misses.push(attempt);
    }
  }

  return { variants: variantCount, caught, held_out: heldOutCount, held_out_caught, misses, open_misses };
}

/** Returns `rule` with `red_team` filled in — the display-ready shape the rules page and ring
 *  detail page both want, so neither has to know how the score is computed. */
export function redTeamRule(rule: ProposedRule): ProposedRule {
  return { ...rule, red_team: attackRule(rule) };
}
