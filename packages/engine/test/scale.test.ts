import { describe, expect, it } from "vitest";
import { scoreRun, type PayoutItem, type PayoutRun } from "../src";

const PAYEES = 15_000;
const RINGS = 40;
const RING_SIZE = 23;

function createScaleRun(): PayoutRun {
  const items: PayoutItem[] = [];
  const ringPayees = RINGS * RING_SIZE;
  for (let i = 0; i < PAYEES; i++) {
    const ringIndex = Math.floor(i / RING_SIZE);
    const ringMemberIndex = i % RING_SIZE;
    const inRing = i < ringPayees;
    const signupAt = inRing
      ? new Date(Date.UTC(2026, 10, 2, 8, Math.floor((i % RING_SIZE) * 14 / RING_SIZE))).toISOString()
      : new Date(Date.UTC(2026, 10, 1, (i % 24), Math.floor(i / 24) % 60)).toISOString();
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
  return { sender_batch_header: { sender_batch_id: "scale-15k" }, items };
}

describe("scoreRun scale target", () => {
  it("scores 15,000 payees containing 40 seeded rings in under 10 seconds", () => {
    const run = createScaleRun();
    const start = performance.now();
    const result = scoreRun(run);
    const elapsedMs = performance.now() - start;

    expect(result.decisions).toHaveLength(PAYEES);
    expect(result.rings).toHaveLength(RINGS);
    expect(result.rings.every((ring) => ring.size === RING_SIZE)).toBe(true);
    expect(elapsedMs).toBeLessThan(10_000);
  }, 15_000);
});
