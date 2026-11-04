/**
 * Learned rules (FR-10, FR-11): the agent proposes, code checks, a person approves.
 *
 * A proposed rule must pass the schema check, and is then backtested over this program's own past
 * runs and attacked by the red team before anyone can approve it — both scores are stored with it,
 * so the rule page can show where it came from and how it held up. A rule that would hold more
 * than 5% of any past run is flagged and needs an explicit second look to approve (PRD: "Big
 * rules get a second look"). Approval only ever adds holds: the engine can't let a rule pay.
 */
import { attackRule, type ProposedRule } from "@ringfence/agents";
import { backtest, normalizeEmail, STARTER_RULE_SET_VERSION, validateRule, type LabeledRun, type PayoutItem, type Rule, type RuleContext } from "@ringfence/engine";
import { ApiError, audit, withProgram, type Db, type Queryable } from "./db";

const BIG_RULE_SHARE = 0.05;
const BACKTEST_RUNS = 8; // ponytail: the 8 most recent runs held in memory; page through them if history grows large

/** The approved learned rules and confirmed-fraud list a new run is decided under. */
export async function loadRuleContext(q: Queryable, programId: string): Promise<{ rules: Rule[]; ctx: RuleContext; version: string }> {
  const approved = await q.query<{ rule_id: string; version: number; body: Rule }>(
    `SELECT DISTINCT ON (rule_id) rule_id, version, body FROM rules
     WHERE program_id = $1 AND status = 'approved' ORDER BY rule_id, version DESC`,
    [programId],
  );
  const fraud = await q.query<{ kind: string; value: string }>("SELECT kind, value FROM known_fraud WHERE program_id = $1", [programId]);
  return {
    rules: approved.map((r) => r.body),
    ctx: {
      knownFraud: {
        devices: fraud.filter((f) => f.kind === "device").map((f) => f.value),
        payoutAddresses: fraud.filter((f) => f.kind === "payout_address").map((f) => f.value),
      },
    },
    version: [STARTER_RULE_SET_VERSION, ...approved.map((r) => `${r.rule_id}v${r.version}`)].join("+"),
  };
}

/** This program's recent runs, rebuilt from the stored items, each labeled with what turned out to
 *  be fraud: confirmed (blocked) payees, plus anyone sharing a confirmed ring's device or address. */
async function labeledPastRuns(q: Queryable, programId: string, ctx: RuleContext): Promise<LabeledRun[]> {
  const runs = await q.query<{ run_id: string }>("SELECT run_id FROM runs WHERE program_id = $1 ORDER BY created_at DESC LIMIT $2", [programId, BACKTEST_RUNS]);
  const devices = new Set(ctx.knownFraud?.devices ?? []);
  const addresses = new Set(ctx.knownFraud?.payoutAddresses ?? []);
  const labeled: LabeledRun[] = [];
  for (const { run_id } of runs.reverse()) {
    const rows = await q.query<{ sender_item_id: string; receiver: string; amount_value: string; currency: string; context: PayoutItem["context"]; state: string }>(
      "SELECT sender_item_id, receiver, amount_value, currency, context, state FROM items WHERE program_id = $1 AND run_id = $2",
      [programId, run_id],
    );
    const items: PayoutItem[] = rows.map((r) => ({
      recipient_type: "EMAIL",
      receiver: r.receiver,
      amount: { value: r.amount_value, currency: r.currency },
      sender_item_id: r.sender_item_id,
      context: r.context,
    }));
    const fraud = new Set(
      rows
        .filter((r) => r.state === "blocked" || devices.has(r.context.device_hash) || addresses.has(normalizeEmail(r.receiver).email))
        .map((r) => r.sender_item_id),
    );
    labeled.push({ run: { sender_batch_header: { sender_batch_id: run_id }, items }, fraud });
  }
  return labeled;
}

export interface StoredRule {
  rule_id: string;
  version: number;
  body: Rule;
  source: string | null;
  status: "proposed" | "approved";
  backtest: ReturnType<typeof backtest>;
  red_team: ReturnType<typeof attackRule>;
  flags: string[];
  approved_by: string | null;
  approved_at: string | null;
}

const RULE_COLUMNS = "rule_id, version, body, source, status, backtest, red_team, flags, approved_by, approved_at";

export async function proposeRule(db: Db, programId: string, rule: Rule, source?: string): Promise<StoredRule> {
  const problems = validateRule(rule);
  if (problems.length > 0) throw new ApiError(400, `rule fails the schema check: ${problems.join("; ")}`);

  return withProgram(db, programId, async (q) => {
    const { ctx } = await loadRuleContext(q, programId);
    const past = await labeledPastRuns(q, programId, ctx);
    const scores = backtest(rule, past, ctx);
    const redTeam = attackRule(rule as ProposedRule);
    const flags = past.some(({ run, fraud }) => {
      const r = backtest(rule, [{ run, fraud }], ctx);
      return run.items.length > 0 && (r.caught + r.false_holds) / run.items.length > BIG_RULE_SHARE;
    })
      ? ["holds_over_5_percent"]
      : [];

    const [{ next } = { next: 1 }] = await q.query<{ next: number }>(
      "SELECT COALESCE(max(version), 0) + 1 AS next FROM rules WHERE program_id = $1 AND rule_id = $2",
      [programId, rule.id],
    );
    const [stored] = await q.query<StoredRule>(
      `INSERT INTO rules (program_id, rule_id, version, body, source, backtest, red_team, flags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${RULE_COLUMNS}`,
      [programId, rule.id, next, JSON.stringify(rule), source ?? rule.source ?? null, JSON.stringify(scores), JSON.stringify(redTeam), JSON.stringify(flags)],
    );
    await audit(q, programId, "api", "rule_proposed", { rule_id: rule.id, version: next, backtest: scores, red_team_caught: redTeam.caught, flags });
    return stored as StoredRule;
  });
}

export async function approveRule(db: Db, programId: string, ruleId: string, approvedBy: string, acknowledgeFlags = false): Promise<StoredRule> {
  return withProgram(db, programId, async (q) => {
    const [latest] = await q.query<StoredRule>(
      `SELECT ${RULE_COLUMNS} FROM rules WHERE program_id = $1 AND rule_id = $2 ORDER BY version DESC LIMIT 1`,
      [programId, ruleId],
    );
    if (!latest) throw new ApiError(404, `no rule ${ruleId}`);
    if (latest.status === "approved") return latest;
    if (latest.flags.length > 0 && !acknowledgeFlags) {
      throw new ApiError(409, `rule ${ruleId} v${latest.version} is flagged (${latest.flags.join(", ")}); approve with acknowledge_flags after a second look`);
    }
    const [approved] = await q.query<StoredRule>(
      `UPDATE rules SET status = 'approved', approved_by = $4, approved_at = now()
       WHERE program_id = $1 AND rule_id = $2 AND version = $3 RETURNING ${RULE_COLUMNS}`,
      [programId, ruleId, latest.version, approvedBy],
    );
    await audit(q, programId, approvedBy, "rule_approved", { rule_id: ruleId, version: latest.version });
    return approved as StoredRule;
  });
}

export async function listRules(db: Db, programId: string): Promise<StoredRule[]> {
  return withProgram(db, programId, (q) =>
    q.query<StoredRule>(`SELECT ${RULE_COLUMNS} FROM rules WHERE program_id = $1 ORDER BY rule_id, version`, [programId]),
  );
}
