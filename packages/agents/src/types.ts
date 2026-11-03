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

export interface ProposedRule {
  /** A rule id, same "R-NN" convention the PRD uses for both rings and the rules they produce — a
   *  separate numbering space from ring ids, distinguished by context only (matches final-prd.docx). */
  id: string;
  action: "HOLD" | "BLOCK";
  when: { all: RuleCondition[] };
  source: string;
  /** Filled in later: A's backtester (FR-10) and our own red team (FR-13, task 7). */
  backtest?: { weeks: number; caught: number; usd: number; false_holds: number };
  red_team?: { variants: number; caught: number; held_out: number; held_out_caught: number; misses: string[] };
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
