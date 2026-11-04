import { describe, expect, it } from "vitest";
import { scoreRun, type PayoutItem, type PayoutRun } from "../src";
import { generateWeek1 } from "../../../scripts/demo-generator/src/week1";

function fixtureRun(items: PayoutItem[], id: string): PayoutRun {
  return { sender_batch_header: { sender_batch_id: id }, items };
}

function ordinaryAccount(id: number, overrides: Partial<PayoutItem["context"]> = {}): PayoutItem {
  return {
    recipient_type: "EMAIL",
    receiver: `person${id}@example.test`,
    amount: { value: "20.00", currency: "USD" },
    sender_item_id: `ref_${id}`,
    context: {
      account_id: `u_${id}`,
      signup_at: new Date(Date.UTC(2026, 10, 1, 8, id % 60)).toISOString(),
      device_hash: `device_${id}`,
      ip_prefix: `10.${Math.floor(id / 256)}.${id % 256}.0/24`,
      onboarding_seconds: 600,
      activity_after_onboarding: 4,
      ...overrides,
    },
  };
}

function confusion(items: PayoutItem[], fraudIds: Set<string>) {
  const result = scoreRun(fixtureRun(items, "eval"));
  const held = new Set(result.decisions.filter((item) => item.decision === "HOLD").map((item) => item.sender_item_id));
  const truePositive = [...fraudIds].filter((id) => held.has(id)).length;
  const falsePositive = [...held].filter((id) => !fraudIds.has(id)).length;
  const precision = held.size === 0 ? 1 : truePositive / held.size;
  const recall = fraudIds.size === 0 ? 1 : truePositive / fraudIds.size;
  const falseHoldRate = (items.length - fraudIds.size) === 0 ? 0 : falsePositive / (items.length - fraudIds.size);
  return { truePositive, falsePositive, precision, recall, falseHoldRate };
}

describe("scenario evaluation", () => {
  it("reports Week 1 precision, recall, and false holds against ground truth", () => {
    const { run, truth } = generateWeek1(42);
    const fraudIds = new Set(truth.filter((label) => label.group === "ring").map((label) => label.sender_item_id));
    const metrics = confusion(run.items, fraudIds);

    expect(metrics).toEqual({
      truePositive: 23,
      falsePositive: 2,
      precision: 23 / 25,
      recall: 1,
      falseHoldRate: 2 / 389,
    });
  });

  it("keeps family and dorm hard negatives paid despite benign shared infrastructure", () => {
    const family = Array.from({ length: 6 }, (_, i) =>
      ordinaryAccount(20_000 + i, { device_hash: "shared-family-tablet", ip_prefix: "10.80.1.0/24" }),
    );
    const dorm = Array.from({ length: 12 }, (_, i) =>
      ordinaryAccount(21_000 + i, {
        ip_prefix: "10.90.1.0/24",
        signup_at: new Date(Date.UTC(2026, 10, 1, 0, i * 60)).toISOString(),
      }),
    );

    for (const scenario of [family, dorm]) {
      const result = scoreRun(fixtureRun(scenario, "hard-negative"));
      expect(result.decisions.every((decision) => decision.decision === "PAY")).toBe(true);
    }
  });

  it("measures recall on a Week 2 rotating-device disguise", () => {
    const { run, truth } = generateWeek1(42);
    const ringIds = new Set(truth.filter((label) => label.group === "ring").map((label) => label.sender_item_id));
    const ring = run.items.filter((item) => ringIds.has(item.sender_item_id));
    const disguised = ring.map((item, index) => ({
      ...item,
      receiver: `operator.alias${index + 1}@outlook.com`,
      context: {
        ...item.context,
        device_hash: `rotating-device-${index}`,
        // The shared network is the surviving week-two signal; staggered signups still
        // form a connected chain through the 30-minute neighborhood window.
        signup_at: new Date(Date.UTC(2026, 10, 8, 8, index * 15)).toISOString(),
      },
    }));
    const metrics = confusion(disguised, ringIds);

    expect(metrics.recall).toBe(1);
    expect(metrics.falseHoldRate).toBe(0);
    expect(metrics.precision).toBe(1);
  });
});
