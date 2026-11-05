/**
 * Rule engine (FR-4): starter rules and learned rules, in one versioned JSON shape, layered on top
 * of scoreRun's graph baseline. Every decision lists the rules that produced it — a PAY lists S-00,
 * the default — and the signals behind them, so no payee is ever paid, held or blocked without a
 * named reason.
 *
 * Rules only tighten: the final decision is the most severe of every rule that matched
 * (BLOCK > HOLD > PAY), so a learned rule can hold or block something the graph missed but can
 * never turn a hold back into a payment. Only S-00 may say PAY; `validateRule` (the schema check a
 * proposed rule must pass before approval) rejects a PAY rule from anywhere else, and any signal
 * the evaluator doesn't know, so a malformed rule fails loudly instead of silently matching nobody.
 *
 * The rule shape is the same one packages/agents' investigator proposes (ProposedRule), declared
 * here structurally because agents depends on engine, not the other way round.
 *
 * Not supported yet: `similar_answers` (word-trigram overlap). The demo ring rewords its answers,
 * so trigrams barely fire on it, and no proposed rule uses it; validateRule rejects it until it does.
 *
 * `network_match` (S-03, FR-19) is deliberately the same: it's a fixed starter signal, not one an
 * investigator can propose or compose into a learned rule, so validateRule doesn't recognize it —
 * a proposed rule naming it fails the schema check as an unknown signal, same as a typo would.
 */
import { normalizeEmail } from "./identity";
import { scoreRun } from "./score-run";
import type { Decision, ItemDecision, PayoutItem, PayoutRun, RingSummary } from "./types";

export interface RuleCondition {
  signal: string;
  same?: string;
  window_min?: number;
  min_accounts?: number;
  max?: number;
  min?: number;
}

export interface Rule {
  id: string;
  action: Decision;
  when: { all: RuleCondition[] };
  source?: string;
}

export interface RuleDecision extends ItemDecision {
  /** Every rule that matched this payee; ["S-00"] when nothing held it. */
  rules: string[];
}

export interface RuleContext {
  /** Devices and normalized payout addresses from rings confirmed in this program (S-02). */
  knownFraud?: { devices: Iterable<string>; payoutAddresses: Iterable<string> };
  /**
   * Devices and normalized payout addresses, among *this run's own items*, that matched a ring
   * confirmed at another program (S-03, FR-19). The caller resolves this from keyed-hash lookups
   * against the shared network before calling in — the engine never sees or computes a hash, only
   * plaintext values it already had for its own payees, so this package stays free of any network
   * or crypto concern. Unlike S-02, a network match only ever holds, never blocks: this program
   * hasn't independently confirmed it yet.
   */
  networkMatch?: { devices: Iterable<string>; payoutAddresses: Iterable<string> };
}

export interface RuleRunResult {
  rule_set_version: string;
  decisions: RuleDecision[];
  rings: RingSummary[];
}

export const STARTER_RULE_SET_VERSION = "starter-1";

export const STARTER_RULES: Rule[] = [
  { id: "S-00", action: "PAY", when: { all: [] }, source: "default: pay unless a rule holds or blocks" },
  { id: "S-01", action: "HOLD", when: { all: [{ signal: "graph_community" }] }, source: "graph engine: a linked group carrying a risk flag" },
  { id: "S-02", action: "BLOCK", when: { all: [{ signal: "known_fraud" }] }, source: "a device or payout address from a ring confirmed in this program" },
  { id: "S-03", action: "HOLD", when: { all: [{ signal: "network_match" }] }, source: "a keyed hash matching a ring confirmed at another program" },
];

const SEVERITY: Record<Decision, number> = { PAY: 0, HOLD: 1, BLOCK: 2 };
const BURST_KEYS: Record<string, (item: PayoutItem) => string | undefined> = {
  referrer: (item) => item.context.referrer_id,
};

/** The schema check (FR-8): returns what's wrong with a proposed rule, empty when it's valid. */
export function validateRule(rule: Rule): string[] {
  const problems: string[] = [];
  if (!/^[A-Z]-\d{2,}$/.test(rule.id)) problems.push(`id "${rule.id}" is not like "R-07"`);
  if (rule.action !== "HOLD" && rule.action !== "BLOCK") problems.push(`action must be HOLD or BLOCK, got ${rule.action}`);
  if (!Array.isArray(rule.when?.all) || rule.when.all.length === 0) problems.push("when.all needs at least one condition");
  for (const c of rule.when?.all ?? []) {
    switch (c.signal) {
      case "signup_burst":
        if (!c.same || !BURST_KEYS[c.same]) problems.push(`signup_burst.same must be one of ${Object.keys(BURST_KEYS).join(", ")}`);
        if (!(Number(c.window_min) > 0)) problems.push("signup_burst needs window_min > 0");
        if (!(Number(c.min_accounts) >= 2)) problems.push("signup_burst needs min_accounts >= 2");
        break;
      case "onboarding_seconds":
      case "activity_after_onboarding":
        if (c.max === undefined && c.min === undefined) problems.push(`${c.signal} needs max or min`);
        break;
      case "disposable_email":
      case "graph_community":
      case "known_fraud":
        break;
      default:
        problems.push(`unknown signal "${c.signal}"`);
    }
  }
  return problems;
}

/** sender_item_ids inside a burst: at least `min` items sharing a key within `windowMin` minutes. */
function burstMembers(items: PayoutItem[], keyOf: (item: PayoutItem) => string | undefined, windowMin: number, min: number): Set<string> {
  const groups = new Map<string, PayoutItem[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  const members = new Set<string>();
  const windowMs = windowMin * 60_000;
  for (const group of groups.values()) {
    if (group.length < min) continue;
    const sorted = group
      .map((item) => ({ id: item.sender_item_id, t: Date.parse(item.context.signup_at) }))
      .sort((a, b) => a.t - b.t);
    // Two pointers: for each start, the widest window that fits; mark it if it's big enough.
    let end = 0;
    for (let start = 0; start < sorted.length; start++) {
      end = Math.max(end, start);
      while (end + 1 < sorted.length && (sorted[end + 1]?.t ?? Infinity) - (sorted[start]?.t ?? 0) <= windowMs) end++;
      if (end - start + 1 >= min) for (let k = start; k <= end; k++) members.add(sorted[k]?.id ?? "");
    }
  }
  return members;
}

function withinBounds(value: number | undefined, c: RuleCondition): boolean {
  if (typeof value !== "number") return false;
  return (c.max === undefined || value <= c.max) && (c.min === undefined || value >= c.min);
}

/** The payees in `run` a rule matches, given the graph baseline's held set. */
function matchRule(rule: Rule, run: PayoutRun, graphHeld: Set<string>, ctx: RuleContext): Set<string> {
  const devices = new Set(ctx.knownFraud?.devices ?? []);
  const addresses = new Set(ctx.knownFraud?.payoutAddresses ?? []);
  const networkDevices = new Set(ctx.networkMatch?.devices ?? []);
  const networkAddresses = new Set(ctx.networkMatch?.payoutAddresses ?? []);
  const bursts = rule.when.all
    .filter((c) => c.signal === "signup_burst")
    .map((c) => burstMembers(run.items, BURST_KEYS[c.same ?? ""] ?? (() => undefined), c.window_min ?? 0, c.min_accounts ?? Infinity));

  const matched = new Set<string>();
  for (const item of run.items) {
    let burstIndex = 0;
    const ok = rule.when.all.every((c) => {
      switch (c.signal) {
        case "signup_burst":
          return bursts[burstIndex++]?.has(item.sender_item_id) ?? false;
        case "onboarding_seconds":
          return withinBounds(item.context.onboarding_seconds, c);
        case "activity_after_onboarding":
          return withinBounds(item.context.activity_after_onboarding, c);
        case "disposable_email":
          return normalizeEmail(item.receiver).disposable;
        case "graph_community":
          return graphHeld.has(item.sender_item_id);
        case "known_fraud":
          return devices.has(item.context.device_hash) || addresses.has(normalizeEmail(item.receiver).email);
        case "network_match":
          return networkDevices.has(item.context.device_hash) || networkAddresses.has(normalizeEmail(item.receiver).email);
        default:
          throw new Error(`Rule ${rule.id}: unknown signal "${c.signal}" (validateRule should have caught it)`);
      }
    });
    if (ok) matched.add(item.sender_item_id);
  }
  return matched;
}

/**
 * Scores a run with the graph baseline, then applies `learnedRules` on top of the starter rules.
 * `ruleSetVersion` names the learned set (e.g. its approval count) so a stored decision can be
 * traced to the exact rules it ran under.
 */
export function evaluateRules(run: PayoutRun, learnedRules: Rule[] = [], ctx: RuleContext = {}, ruleSetVersion = STARTER_RULE_SET_VERSION): RuleRunResult {
  const scored = scoreRun(run);
  const baseline = new Map(scored.decisions.map((d) => [d.sender_item_id, d] as const));
  const graphHeld = new Set(scored.decisions.filter((d) => d.decision !== "PAY").map((d) => d.sender_item_id));

  const fired = new Map<string, Rule[]>();
  for (const rule of [...STARTER_RULES.slice(1), ...learnedRules]) {
    for (const id of matchRule(rule, run, graphHeld, ctx)) {
      const list = fired.get(id);
      if (list) list.push(rule);
      else fired.set(id, [rule]);
    }
  }

  const decisions = run.items.map((item): RuleDecision => {
    const base = baseline.get(item.sender_item_id) as ItemDecision;
    const rules = fired.get(item.sender_item_id) ?? [];
    if (rules.length === 0) return { ...base, decision: "PAY", rules: ["S-00"] };

    const decision = rules.reduce<Decision>((worst, r) => (SEVERITY[r.action] > SEVERITY[worst] ? r.action : worst), "PAY");
    const reasons = new Set(base.reasons);
    for (const r of rules) for (const c of r.when.all) if (c.signal !== "graph_community") reasons.add(c.signal);
    // A payee held only by a rule (no graph group) is bulk-decided under that rule's id.
    const firstRule = rules.find((r) => r.id !== "S-01");
    return {
      ...base,
      decision,
      hold_group_id: base.hold_group_id ?? firstRule?.id,
      reasons: [...reasons],
      rules: rules.map((r) => r.id),
    };
  });

  return { rule_set_version: ruleSetVersion, decisions, rings: scored.rings };
}

/** One labeled past run for the backtester: `fraud` holds the sender_item_ids later confirmed as fraud. */
export interface LabeledRun {
  run: PayoutRun;
  fraud: Set<string>;
}

export interface BacktestResult {
  weeks: number;
  caught: number;
  usd: number;
  false_holds: number;
}

/**
 * Backtester (FR-10): replays one rule, on its own, over past runs and counts what it would have
 * held — confirmed fraud it catches (and those dollars) against real payees it would have held by
 * mistake. Uses the same matcher as live scoring, so a backtest can't disagree with a real run.
 */
export function backtest(rule: Rule, pastRuns: LabeledRun[], ctx: RuleContext = {}): BacktestResult {
  const result: BacktestResult = { weeks: pastRuns.length, caught: 0, usd: 0, false_holds: 0 };
  for (const { run, fraud } of pastRuns) {
    const needsGraph = rule.when.all.some((c) => c.signal === "graph_community");
    const graphHeld = new Set(needsGraph ? scoreRun(run).decisions.filter((d) => d.decision !== "PAY").map((d) => d.sender_item_id) : []);
    const amountById = new Map(run.items.map((item) => [item.sender_item_id, Number(item.amount.value)] as const));
    for (const id of matchRule(rule, run, graphHeld, ctx)) {
      if (fraud.has(id)) {
        result.caught += 1;
        result.usd += amountById.get(id) ?? 0;
      } else {
        result.false_holds += 1;
      }
    }
  }
  result.usd = Math.round(result.usd * 100) / 100;
  return result;
}
