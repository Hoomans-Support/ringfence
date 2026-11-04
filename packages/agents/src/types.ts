/**
 * FR-8/FR-9: the investigator writes a case file for a held ring, and the claim checker re-runs
 * every claim against the real data before anyone sees it. Each claim carries a structured
 * `check` descriptor alongside its prose `text` — checkClaims re-derives the fact from the cited
 * accounts' real fields, it never just trusts the sentence. That is the actual safeguard: an LLM
 * (or a bug in the scripted investigator below) can write a wrong sentence, but it can't make
 * checkClaims agree unless the data backs it up.
 */

export type ClaimKind =
  | "shared_device"
  | "signup_window"
  | "onboarding_speed"
  | "quiet_after_onboarding"
  | "alias_pattern"
  | "shared_referrer";

export interface ClaimCheck {
  kind: ClaimKind;
  account_ids: string[];
  device_hash?: string;
  window_minutes?: number;
  max_onboarding_seconds?: number;
  max_activity_after_onboarding?: number;
  alias_key?: string;
  referrer_id?: string;
}

export interface Claim {
  id: string;
  /** The plain-English sentence a person reads, per design.md's voice rules. */
  text: string;
  check: ClaimCheck;
  /** Set by checkClaims; absent on a freshly-investigated, not-yet-checked case file. */
  checked?: boolean;
}

export interface RuleCondition {
  signal: string;
  same?: string;
  window_min?: number;
  min_accounts?: number;
  max?: number;
  min?: number;
}

/** One of attackRule's 200 disguised copies. `same_referrer` is categorical — matched the original
 *  ring's referrer or didn't. The other three are continuous simulated values (minutes, seconds, a
 *  count), not pass/fail booleans: see attack-rule.ts's module doc for why a revision widening a
 *  rule's threshold has to be able to actually catch a disguise it previously missed. */
export interface DisguiseAttempt {
  id: string;
  held_out: boolean;
  same_referrer: boolean;
  signup_spread_minutes: number;
  onboarding_seconds: number;
  activity_after_onboarding: number;
}

/** The ring's true observed stats — fixed at proposal time and carried unchanged through every
 *  revision of the rule, so attackRule can simulate a disguise relative to what the ring actually
 *  did, not whatever threshold the *current* rule happens to state (which, after a widen, is no
 *  longer the same number). Optional: a rule built without one (e.g. by hand, in a test) falls back
 *  in attack-rule.ts to reading its own `when` thresholds as the baseline, which is only correct for
 *  a rule that's never been revised. */
export interface RuleBaseline {
  window_min?: number;
  onboarding_seconds?: number;
  activity_after_onboarding?: number;
}

export interface ProposedRule {
  /** A rule id, same "R-NN" convention the PRD uses for both rings and the rules they produce — a
   *  separate numbering space from ring ids, distinguished by context only (matches final-prd.docx). */
  id: string;
  action: "HOLD" | "BLOCK";
  when: { all: RuleCondition[] };
  source: string;
  baseline?: RuleBaseline;
  /** Filled in later: A's backtester (FR-10) and our own red team (FR-13, task 7). */
  backtest?: { weeks: number; caught: number; usd: number; false_holds: number };
  red_team?: {
    variants: number;
    caught: number;
    held_out: number;
    held_out_caught: number;
    misses: string[];
    /** The non-held-out misses, in full — the candidates for a saved open red-team case (see
     *  red-team-cases.ts). Held-out misses are deliberately excluded: they stay invisible to the
     *  next rule proposal so a revision's held-out score still tests generalisation. */
    open_misses: DisguiseAttempt[];
  };
  /** Filled in once a person actually approves it (FR-11) — never set by the agent itself. */
  approved_by?: string;
}

export interface CaseFile {
  ring_id: string;
  claims: Claim[];
  proposed_rule: ProposedRule;
  /** "N of N claims checked", as the console shows it. */
  claims_checked: { checked: number; total: number };
}

/** One saved red-team miss (the learning loop, see red-team-cases.ts module doc). Carries the full
 *  `attempt` rather than just an id so it can be replayed against a later revision of the rule via
 *  `caughtBy` — a revision reseeds attackRule's PRNG under a new rule id, so there's no other way to
 *  ask "would the new rule have caught this specific disguise". */
export interface RedTeamCase {
  id: string;
  missedByRuleId: string;
  attempt: DisguiseAttempt;
  /** Which of the missed rule's conditions this attempt beat, from attack-rule.ts's failingSignals —
   *  e.g. "signup_burst:window", "onboarding_seconds". Drives which threshold a revision widens. */
  failedSignals: string[];
  status: "open" | "closed";
  /** Set once a revised rule's `when` catches this attempt (closeCaughtCases). */
  closedByRuleId?: string;
}
