// Shared by scale.test.ts and sensitivity.test.ts: a synthetic run with a configurable number and
// size of seeded rings against an honest population, so both "how fast at the PRD's own numbers"
// and "does detection still hold at other ring shares" can build the same shape of data.
import type { PayoutItem, PayoutRun } from "../src";

export function createSyntheticRingRun(opts: { totalPayees: number; ringCount: number; ringSize: number }): PayoutRun {
  const { totalPayees, ringCount, ringSize } = opts;
  const items: PayoutItem[] = [];
  const ringPayees = ringCount * ringSize;

  for (let i = 0; i < totalPayees; i++) {
    const ringIndex = Math.floor(i / ringSize);
    const ringMemberIndex = i % ringSize;
    const inRing = i < ringPayees;
    const signupAt = inRing
      ? new Date(Date.UTC(2026, 10, 2, 8, Math.floor((i % ringSize) * 14 / ringSize))).toISOString()
      : new Date(Date.UTC(2026, 10, 1, i % 24, Math.floor(i / 24) % 60)).toISOString();
    items.push({
      recipient_type: "EMAIL",
      receiver: inRing
        ? `ring${ringIndex}.member${ringMemberIndex}@scale.example.test`
        : `payee${i}x@scale.example.test`,
      amount: { value: "20.00", currency: "USD" },
      sender_item_id: `ref_${i}`,
      context: {
        account_id: `u_${i}`,
        signup_at: signupAt,
        device_hash: inRing ? `ring-${ringIndex}-device-${i % 3}` : `device-${i}`,
        ip_prefix: inRing ? `10.${ringIndex}.1.0/24` : `172.${Math.floor(i / 65_536)}.${Math.floor(i / 256) % 256}.0/24`,
        onboarding_seconds: inRing ? 90 : 600,
        activity_after_onboarding: inRing ? 0 : 5,
      },
    });
  }
  return { sender_batch_header: { sender_batch_id: "synthetic" }, items };
}
