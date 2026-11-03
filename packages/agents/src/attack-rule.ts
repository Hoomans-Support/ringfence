/**
 * attackRule(rule) -> red-team result (FR-13). Generates disguised copies of the ring that
 * produced `rule` and scores the rule against each one, 50 of the 200 held out. "Disguised" means
 * each copy independently rolls a strength (0 = an exact replica of the original ring, barely
 * trying; 1 = fully committed to blending in) and, scaled by that strength, rolls one pass/fail
 * coin per signal the rule checks: did this copy still share a referrer, still land inside the
 * signup window, still onboard fast, still stay quiet after — the same moves a real ring would
 * make to dodge a rule built from its own, most-obviously-synchronized behaviour. A rule catches a
 * copy only if every one of its conditions' coins comes up "still looks like the original" (the
 * same AND a real rule evaluator would apply). Seeded from the rule's own id, so "Reset demo"
 * reproduces the same 200 attacks and the same score every time.
 *
 * No LLM needed here either, for the same reason as investigate()/checkClaims(): the rule's own
 * conditions are a JSON schema this can evaluate directly, so there is no prose to generate or
 * verify — only coins to flip and AND together. Scores only the three signal types our
 * investigate() actually produces (signup_burst, onboarding_seconds, activity_after_onboarding);
 * an unrecognized signal is treated as satisfied rather than failing the match, so a future rule
 * shape doesn't silently zero out every score.
 *
 * Each axis has its own cost-to-fake coefficient (how much one unit of strength raises that axis's
 * chance of slipping past the rule) rather than one shared probability, because the four signals
 * aren't equally cheap to disguise: swapping referrers or spreading out signup timing costs
 * nothing; faking genuine-looking post-onboarding activity is the hardest to fully fabricate. A
 * condition's own max/window is still read as "the original ring's observed value" (true by
 * construction for anything investigate() proposes) — the coefficients describe how fragile that
 * *kind* of signal is to evasion, not the specific number, so a bigger threshold in isolation
 * doesn't by itself make a condition easier to beat.
 */
import type { ProposedRule, RuleCondition } from "./types";

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

/** How much one unit of disguise strength raises an axis's chance of beating the rule. Higher =
 *  cheaper to fake. `min_accounts` isn't listed: a disguised copy always matches the original
 *  ring's size, so that clause never varies. */
const EVASION_COST = {
  referrer: 0.9,
  window: 1,
  onboarding: 0.6,
  activity: 0.4,
} as const satisfies Record<string, number>;

interface DisguiseAttempt {
  id: string;
  held_out: boolean;
  same_referrer: boolean;
  within_window: boolean;
  onboarding_still_fast: boolean;
  stayed_quiet: boolean;
}

function passesCondition(condition: RuleCondition, a: DisguiseAttempt): boolean {
  switch (condition.signal) {
    case "signup_burst":
      if (condition.same === "referrer" && !a.same_referrer) return false;
      if (condition.window_min !== undefined && !a.within_window) return false;
      return true;
    case "onboarding_seconds":
      return condition.max === undefined || a.onboarding_still_fast;
    case "activity_after_onboarding":
      return condition.max === undefined || a.stayed_quiet;
    default:
      return true;
  }
}

function caughtBy(rule: ProposedRule, a: DisguiseAttempt): boolean {
  return rule.when.all.every((c) => passesCondition(c, a));
}

export type RedTeamResult = NonNullable<ProposedRule["red_team"]>;

export function attackRule(rule: ProposedRule, variantCount = 200, heldOutCount = 50): RedTeamResult {
  const next = mulberry32(hashSeed(rule.id));

  // A coin passes (the disguise fails on that axis, the original behaviour still shows) with
  // probability `1 - strength * cost`; stronger disguise and cheaper-to-fake axes both lower it.
  const coin = (strength: number, axis: keyof typeof EVASION_COST) => next() > strength * EVASION_COST[axis];

  let caught = 0;
  let held_out_caught = 0;
  const misses: string[] = [];

  for (let i = 0; i < variantCount; i++) {
    const held_out = i >= variantCount - heldOutCount;
    const strength = next(); // 0 = barely trying, 1 = fully committed to blending in
    const attempt: DisguiseAttempt = {
      id: `${rule.id}-v${i + 1}`,
      held_out,
      same_referrer: coin(strength, "referrer"),
      within_window: coin(strength, "window"),
      onboarding_still_fast: coin(strength, "onboarding"),
      stayed_quiet: coin(strength, "activity"),
    };

    if (caughtBy(rule, attempt)) {
      caught++;
      if (held_out) held_out_caught++;
    } else {
      misses.push(attempt.id);
    }
  }

  return { variants: variantCount, caught, held_out: heldOutCount, held_out_caught, misses };
}

/** Returns `rule` with `red_team` filled in — the display-ready shape the rules page and ring
 *  detail page both want, so neither has to know how the score is computed. */
export function redTeamRule(rule: ProposedRule): ProposedRule {
  return { ...rule, red_team: attackRule(rule) };
}
