/**
 * The event feed (FR-21, stretch): "Send sign-ups and referrals as they happen, so rings are
 * scored during the week and can be held before payday" (PRD). One row per account_id, merged as
 * events arrive — a referral touch can report a device or referrer before the account's payout
 * email is even known. Scoring reuses scoreRun exactly as a real run would, over $0 synthetic
 * items, so "a ring can be scored before payday" is the real graph engine, not a separate guess.
 *
 * Only disposable_email and the graph's own link signals (shared device/address, alias pattern, IP
 * neighborhood) can fire pre-payday: onboarding_speed and quiet_after_onboarding need timing data
 * that, by definition, isn't known until closer to or at payday, same as a real run missing that
 * context today.
 */
import { scoreRun, type PayoutItem, type RingSummary } from "@ringfence/engine";
import { audit, peekNumbers, sha256, withProgram, type Db } from "./db";

export interface SignupEvent {
  account_id: string;
  receiver?: string;
  signup_at?: string;
  device_hash?: string;
  ip_prefix?: string;
  referrer_id?: string;
  answer?: string;
  onboarding_seconds?: number;
}

/** Records one sign-up or referral event, merging it into whatever this account_id already has. */
export async function recordEvent(db: Db, programId: string, event: SignupEvent): Promise<void> {
  const { account_id, receiver, ip_prefix, ...rest } = event;
  const context = { ...rest, ...(ip_prefix !== undefined ? { ip_prefix: `ip_${sha256(ip_prefix).slice(0, 16)}` } : {}) };
  await withProgram(db, programId, async (q) => {
    await q.query(
      `INSERT INTO pending_signups (program_id, account_id, receiver, context, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (program_id, account_id) DO UPDATE SET
         receiver = COALESCE(EXCLUDED.receiver, pending_signups.receiver),
         context = pending_signups.context || EXCLUDED.context,
         updated_at = now()`,
      [programId, account_id, receiver ?? null, JSON.stringify(context)],
    );
    await audit(q, programId, "api", "event_received", { account_id });
  });
}

export interface AtRiskResult {
  checked: number;
  rings: RingSummary[];
  held: Array<{ account_id: string; ring_id?: string; hold_group_id?: string; reasons: string[] }>;
}

/** Scores every pending (not yet paid) account with the same graph engine a real run would use. */
export async function scorePending(db: Db, programId: string): Promise<AtRiskResult> {
  return withProgram(db, programId, async (q) => {
    const rows = await q.query<{ account_id: string; receiver: string | null; context: Record<string, unknown> }>(
      "SELECT account_id, receiver, context FROM pending_signups WHERE program_id = $1 ORDER BY account_id",
      [programId],
    );
    const items: PayoutItem[] = rows.map((r) => ({
      recipient_type: "EMAIL",
      // normalizeEmail requires an "@"; a receiver this program never reported has to default to
      // something email-shaped, not just a placeholder string, or scoreRun throws building the graph.
      receiver: r.receiver ?? `unknown+${r.account_id}@pending.ringfence.internal`,
      amount: { value: "0.00", currency: "USD" },
      sender_item_id: r.account_id,
      context: {
        account_id: r.account_id,
        signup_at: new Date(0).toISOString(),
        device_hash: `unknown:${r.account_id}`,
        ip_prefix: `unknown:${r.account_id}`,
        ...r.context,
      },
    }));
    // A preview, like a screen: shows the number a real run would give without consuming it (issue #2).
    const { startRing, startPair } = await peekNumbers(q, programId);
    const { decisions, rings } = scoreRun({ sender_batch_header: { sender_batch_id: `pending-${programId}` }, items }, { startRing, startPair });
    const held = decisions
      .filter((d) => d.decision !== "PAY")
      .map((d) => ({ account_id: d.sender_item_id, ...(d.ring_id ? { ring_id: d.ring_id } : {}), ...(d.hold_group_id ? { hold_group_id: d.hold_group_id } : {}), reasons: d.reasons }));
    return { checked: items.length, rings, held };
  });
}
