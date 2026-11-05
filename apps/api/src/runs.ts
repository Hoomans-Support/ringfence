/**
 * POST /v1/payout-runs (FR-1, FR-5): decide a PayPal Payouts request body and record it.
 *
 * The decisions, the items, the batch row and the outbox event that will pay the PAY items are all
 * written in one transaction — the first step of exactly-once. Nothing here calls PayPal; the
 * executor does that from the outbox, so a crash after this commit replays the send instead of
 * losing or repeating it. Resending a run that already exists returns what was recorded the first
 * time, without deciding or sending anything again.
 */
import { evaluateRules, normalizeEmail, type Decision, type PayoutItem, type PayoutRun, type RuleRunResult } from "@ringfence/engine";
import { ApiError, audit, sha256, withProgram, type Db, type Queryable } from "./db";
import { chaos } from "./executor";
import { loadRuleContext } from "./learning";
import { matchNetwork } from "./network";
import type { ItemState } from "./states";

/** The request body: PayPal's own, with Ringfence's optional `context` on each item. */
export interface RunRequest {
  sender_batch_header: { sender_batch_id: string; email_subject?: string };
  items: Array<Omit<PayoutItem, "context"> & { context?: Partial<PayoutItem["context"]> }>;
}

export interface RunResponse {
  run_id: string;
  rule_set_version: string;
  summary: { paid: number; held: number; blocked: number; paid_usd: number; held_usd: number; blocked_usd: number };
  /** batch_status is PayPal's once the batch is sent; before that QUEUED, or NOT_SENT after every
   *  retry failed. `error` is PayPal's last refusal (e.g. INSUFFICIENT_FUNDS) while it isn't sent. */
  paypal: { sender_batch_id: string | null; payout_batch_id: string | null; batch_status: string | null; error?: string };
  decisions: Array<{ sender_item_id: string; decision: string; state: string; ring_id?: string; hold_group_id?: string; reasons: string[]; rules: string[] }>;
}

/** Fills in a missing context so an item with none is scored as its own unlinked account, and
 *  stores the IP prefix hashed (privacy NFR). Equality is all the graph uses, so hashing doesn't
 *  change a single decision. */
function normalize(item: RunRequest["items"][number], receivedAt: string): PayoutItem {
  const ctx = item.context ?? {};
  const own = `unknown:${item.sender_item_id}`;
  return {
    recipient_type: item.recipient_type,
    receiver: item.receiver,
    amount: item.amount,
    sender_item_id: item.sender_item_id,
    context: {
      ...ctx,
      account_id: ctx.account_id ?? own,
      signup_at: ctx.signup_at ?? receivedAt,
      device_hash: ctx.device_hash ?? own,
      ip_prefix: `ip_${sha256(ctx.ip_prefix ?? own).slice(0, 16)}`,
    },
  };
}

const STATE_FOR: Record<Decision, ItemState> = { PAY: "queued", HOLD: "held", BLOCK: "blocked" };

/** Decides a run and records it for the executor to pay. */
export async function submitRun(db: Db, programId: string, body: RunRequest): Promise<{ created: boolean; runId: string }> {
  const result = await recordRun(db, programId, body);
  if (result.created) chaos.hook("after_commit"); // the chaos CLI: die with the run committed but unsent
  return result;
}

/**
 * Day 0 (PRD, user journey): records a run the program already paid straight through PayPal before
 * Ringfence, so its payouts are tracked by the poller and, if they turn out to be a ring's,
 * cancellable while unclaimed. Nothing is decided and nothing is sent.
 */
export function importPastRun(db: Db, programId: string, body: RunRequest, payoutBatchId: string): Promise<{ created: boolean; runId: string }> {
  return recordRun(db, programId, body, payoutBatchId);
}

async function recordRun(db: Db, programId: string, body: RunRequest, importedBatchId?: string): Promise<{ created: boolean; runId: string }> {
  const runId = body.sender_batch_header.sender_batch_id;
  const ids = new Set(body.items.map((i) => i.sender_item_id));
  if (ids.size !== body.items.length) throw new ApiError(400, "sender_item_id must be unique within a run");

  const receivedAt = new Date().toISOString();
  const run: PayoutRun = { sender_batch_header: body.sender_batch_header, items: body.items.map((i) => normalize(i, receivedAt)) };

  try {
    return await withProgram(db, programId, async (q) => {
      const [existing] = await q.query("SELECT 1 FROM runs WHERE program_id = $1 AND run_id = $2", [programId, runId]);
      if (existing) return { created: false, runId };
      const [taken] = await q.query("SELECT 1 FROM batches WHERE sender_batch_id = $1", [runId]);
      if (taken) throw new ApiError(409, `sender_batch_id ${runId} is already in use`);

      let version = "imported";
      let decide = (_item: PayoutItem): ItemRow => ({ decision: "PAY", ring_id: null, hold_group_id: null, reasons: [], rules: ["import"], state: "sent", batch_id: runId });
      if (!importedBatchId) {
        const result = await decideRun(q, programId, run);
        const byId = new Map(result.decisions.map((d) => [d.sender_item_id, d] as const));
        version = result.rule_set_version;
        decide = (item) => {
          const d = byId.get(item.sender_item_id)!;
          return {
            decision: d.decision,
            ring_id: d.ring_id ?? null,
            hold_group_id: d.hold_group_id ?? null,
            reasons: d.reasons,
            rules: d.rules,
            state: STATE_FOR[d.decision],
            batch_id: d.decision === "PAY" ? runId : null,
          };
        };
      }

      await q.query("INSERT INTO runs (program_id, run_id, email_subject, rule_set_version) VALUES ($1, $2, $3, $4)", [
        programId,
        runId,
        body.sender_batch_header.email_subject ?? null,
        version,
      ]);
      const rows = run.items.map((item) => ({
        sender_item_id: item.sender_item_id,
        receiver: item.receiver,
        amount_value: item.amount.value,
        currency: item.amount.currency,
        context: item.context,
        ...decide(item),
      }));
      await q.query(
        `INSERT INTO items (program_id, run_id, sender_item_id, receiver, amount_value, currency, context, decision,
                            ring_id, hold_group_id, reasons, rules, state, batch_id)
         SELECT $1, $2, r.sender_item_id, r.receiver, r.amount_value, r.currency, r.context, r.decision,
                r.ring_id, r.hold_group_id, r.reasons, r.rules, r.state, r.batch_id
         FROM jsonb_to_recordset($3::jsonb) AS r(sender_item_id text, receiver text, amount_value text, currency text,
              context jsonb, decision text, ring_id text, hold_group_id text, reasons jsonb, rules jsonb, state text, batch_id text)`,
        [programId, runId, JSON.stringify(rows)],
      );
      if (rows.some((r) => r.batch_id)) {
        await q.query("INSERT INTO batches (sender_batch_id, program_id, run_id, kind, payout_batch_id) VALUES ($1, $2, $1, $3, $4)", [
          runId,
          programId,
          importedBatchId ? "import" : "run",
          importedBatchId ?? null,
        ]);
        if (!importedBatchId) await q.query("INSERT INTO outbox (program_id, kind, ref) VALUES ($1, 'create_batch', $2)", [programId, runId]);
      }
      // Payday has now happened for these accounts (FR-21): they're no longer "pending".
      await q.query("DELETE FROM pending_signups WHERE program_id = $1 AND account_id = ANY($2::text[])", [programId, run.items.map((i) => i.context.account_id)]);
      await audit(q, programId, "api", importedBatchId ? "run_imported" : "run_received", { run_id: runId, items: run.items.length, rule_set_version: version });
      return { created: true, runId };
    });
  } catch (err) {
    // Two identical runs racing: the loser's insert hits the primary key; it's still a resend.
    if ((err as { code?: string }).code === "23505") return { created: false, runId };
    throw err;
  }
}

/** The one decision step: the run, under this program's approved rules, confirmed-fraud list and
 *  the ring network (FR-19). POST /v1/payout-runs and the MCP screen both come through here, so
 *  they can't disagree. */
async function decideRun(q: Queryable, programId: string, run: PayoutRun): Promise<RuleRunResult> {
  const { rules, ctx, version } = await loadRuleContext(q, programId);
  const networkMatch = await matchNetwork(
    q,
    run.items.map((i) => i.context.device_hash),
    run.items.map((i) => normalizeEmail(i.receiver).email),
  );
  return evaluateRules(run, rules, { ...ctx, networkMatch }, version);
}

export interface ScreenResult {
  rule_set_version: string;
  summary: { pay: number; hold: number; block: number };
  decisions: Array<{ sender_item_id: string; decision: string; ring_id?: string; hold_group_id?: string; reasons: string[]; rules: string[] }>;
}

/** The same decisions a run would get right now, with nothing stored and nothing sent. */
export async function screenRun(db: Db, programId: string, body: RunRequest): Promise<ScreenResult> {
  if (new Set(body.items.map((i) => i.sender_item_id)).size !== body.items.length) throw new ApiError(400, "sender_item_id must be unique within a run");
  const receivedAt = new Date().toISOString();
  const run: PayoutRun = { sender_batch_header: body.sender_batch_header, items: body.items.map((i) => normalize(i, receivedAt)) };
  const result = await withProgram(db, programId, (q) => decideRun(q, programId, run));
  const count = (d: Decision) => result.decisions.filter((x) => x.decision === d).length;
  return {
    rule_set_version: result.rule_set_version,
    summary: { pay: count("PAY"), hold: count("HOLD"), block: count("BLOCK") },
    decisions: result.decisions.map((d) => ({
      sender_item_id: d.sender_item_id,
      decision: d.decision,
      ...(d.ring_id ? { ring_id: d.ring_id } : {}),
      ...(d.hold_group_id ? { hold_group_id: d.hold_group_id } : {}),
      reasons: d.reasons,
      rules: d.rules,
    })),
  };
}

interface ItemRow {
  decision: string;
  ring_id: string | null;
  hold_group_id: string | null;
  reasons: string[];
  rules: string[];
  state: ItemState;
  batch_id: string | null;
}

export async function getRun(db: Db, programId: string, runId: string): Promise<RunResponse | undefined> {
  return withProgram(db, programId, async (q) => {
    const [run] = await q.query<{ rule_set_version: string }>("SELECT rule_set_version FROM runs WHERE program_id = $1 AND run_id = $2", [programId, runId]);
    if (!run) return undefined;
    const items = await q.query<{
      sender_item_id: string; decision: string; state: string; ring_id: string | null; hold_group_id: string | null;
      reasons: string[]; rules: string[]; amount_value: string;
    }>(
      `SELECT sender_item_id, decision, state, ring_id, hold_group_id, reasons, rules, amount_value
       FROM items WHERE program_id = $1 AND run_id = $2 ORDER BY sender_item_id`,
      [programId, runId],
    );
    const [batch] = await q.query<{ sender_batch_id: string; payout_batch_id: string | null; batch_status: string | null }>(
      "SELECT sender_batch_id, payout_batch_id, batch_status FROM batches WHERE program_id = $1 AND sender_batch_id = $2",
      [programId, runId],
    );
    const [send] = await q.query<{ status: string; last_error: string | null }>(
      "SELECT status, last_error FROM outbox WHERE program_id = $1 AND kind = 'create_batch' AND ref = $2",
      [programId, runId],
    );
    const unsent = send && send.status !== "done";

    const summary = { paid: 0, held: 0, blocked: 0, paid_usd: 0, held_usd: 0, blocked_usd: 0 };
    for (const item of items) {
      const key = item.decision === "PAY" ? "paid" : item.decision === "HOLD" ? "held" : "blocked";
      summary[key] += 1;
      summary[`${key}_usd`] = Math.round((summary[`${key}_usd`] + Number(item.amount_value)) * 100) / 100;
    }
    return {
      run_id: runId,
      rule_set_version: run.rule_set_version,
      summary,
      paypal: {
        sender_batch_id: batch?.sender_batch_id ?? null,
        payout_batch_id: batch?.payout_batch_id ?? null,
        batch_status: batch?.batch_status ?? (!batch ? null : send?.status === "failed" ? "NOT_SENT" : "QUEUED"),
        ...(unsent && send.last_error ? { error: send.last_error } : {}),
      },
      decisions: items.map((i) => ({
        sender_item_id: i.sender_item_id,
        decision: i.decision,
        state: i.state,
        ...(i.ring_id ? { ring_id: i.ring_id } : {}),
        ...(i.hold_group_id ? { hold_group_id: i.hold_group_id } : {}),
        reasons: i.reasons,
        rules: i.rules,
      })),
    };
  });
}
