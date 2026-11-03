import { describe, expect, it } from "vitest";
import { scoreRun } from "../src/score-run";
import type { PayoutItem, PayoutRun } from "../src/types";

const BASE_TIME = new Date("2026-11-02T09:00:00Z").getTime();

function iso(minutesFromBase: number): string {
  return new Date(BASE_TIME + minutesFromBase * 60_000).toISOString();
}

function item(
  id: string,
  receiver: string,
  overrides: Partial<PayoutItem["context"]> = {},
): PayoutItem {
  return {
    recipient_type: "EMAIL",
    receiver,
    amount: { value: "20.00", currency: "USD" },
    sender_item_id: `ref_${id}`,
    context: {
      account_id: `u_${id}`,
      signup_at: iso(0),
      device_hash: `d_${id}`,
      ip_prefix: `10.${id}.0.0/24`,
      activity_after_onboarding: 5,
      onboarding_seconds: 600,
      ...overrides,
    },
  };
}

function decisionFor(result: ReturnType<typeof scoreRun>, senderItemId: string) {
  const d = result.decisions.find((x) => x.sender_item_id === senderItemId);
  if (!d) throw new Error(`no decision for ${senderItemId}`);
  return d;
}

describe("scoreRun", () => {
  it("holds a 23-account ring as one ring, held as a group", () => {
    const devices = ["d_ring_1", "d_ring_2", "d_ring_3"];
    const ringItems: PayoutItem[] = Array.from({ length: 23 }, (_, i) =>
      item(`ring${i}`, `finrabbit${String(i).padStart(2, "0")}@gmail.com`, {
        device_hash: devices[i % 3],
        ip_prefix: "10.9.9.0/24",
        signup_at: iso(i), // all 23 within a 15-minute window
        referrer_id: "u_referrer",
        onboarding_seconds: 90,
        activity_after_onboarding: 0,
      }),
    );

    const honest = item("honest1", "casual.person@yahoo.com");

    const run: PayoutRun = {
      sender_batch_header: { sender_batch_id: "test_ring" },
      items: [...ringItems, honest],
    };

    const result = scoreRun(run);

    const ringDecisions = ringItems.map((it) => decisionFor(result, it.sender_item_id));
    const ringIds = new Set(ringDecisions.map((d) => d.ring_id));
    expect(ringIds.size).toBe(1);
    expect([...ringIds][0]).toMatch(/^R-\d\d$/);
    for (const d of ringDecisions) expect(d.decision).toBe("HOLD");

    expect(result.rings.length).toBe(1);
    expect(result.rings[0]?.size).toBe(23);
    // Louvain still finds the 3 device clusters inside the one ring — exposed
    // as structural detail, not used to split the hold.
    expect(result.rings[0]?.louvain_clusters).toBe(3);

    expect(decisionFor(result, honest.sender_item_id).decision).toBe("PAY");
  });

  it("holds two roommates sharing a laptop as a pair, not a ring", () => {
    const roommateA = item("rmA", "sam.rivera@gmail.com", {
      device_hash: "d_roommates_laptop",
      ip_prefix: "10.50.0.0/24",
      onboarding_seconds: 45,
      activity_after_onboarding: 3, // active, not quiet — held on speed, not quiet
    });
    const roommateB = item("rmB", "alex.kim@gmail.com", {
      device_hash: "d_roommates_laptop",
      ip_prefix: "10.51.0.0/24",
      onboarding_seconds: 60,
      activity_after_onboarding: 2,
    });

    const run: PayoutRun = {
      sender_batch_header: { sender_batch_id: "test_roommates" },
      items: [roommateA, roommateB],
    };

    const result = scoreRun(run);
    const a = decisionFor(result, roommateA.sender_item_id);
    const b = decisionFor(result, roommateB.sender_item_id);

    expect(a.decision).toBe("HOLD");
    expect(b.decision).toBe("HOLD");
    expect(a.ring_id).toBeUndefined();
    expect(b.ring_id).toBeUndefined();
    expect(a.hold_group_id).toBeDefined();
    expect(a.hold_group_id).toBe(b.hold_group_id);
    expect(a.reasons).toContain("shared_device:d_roommates_laptop");
    expect(a.reasons).toContain("onboarding_speed");
    expect(result.rings.length).toBe(0); // a pair is not a ring
  });

  it("pays coworkers who only share wording, with no device, IP or address link", () => {
    const coworkers: PayoutItem[] = Array.from({ length: 5 }, (_, i) =>
      item(`cw${i}`, `coworker${i}@outlook.com`, {
        device_hash: `d_coworker_${i}`,
        ip_prefix: `10.${60 + i}.0.0/24`,
        signup_at: iso(1000 + i),
        onboarding_seconds: 400, // normal pace
        activity_after_onboarding: 4, // active afterward
      }),
    );

    const run: PayoutRun = {
      sender_batch_header: { sender_batch_id: "test_coworkers" },
      items: coworkers,
    };

    const result = scoreRun(run);
    for (const it of coworkers) {
      const d = decisionFor(result, it.sender_item_id);
      expect(d.decision).toBe("PAY");
      expect(d.ring_id).toBeUndefined();
      expect(d.hold_group_id).toBeUndefined();
    }
  });

  it("never holds a lone account, even with every risk flag set", () => {
    const lone = item("lone1", "fast.quiet@mailinator.com", {
      onboarding_seconds: 10,
      activity_after_onboarding: 0,
    });

    const result = scoreRun({ sender_batch_header: { sender_batch_id: "test_lone" }, items: [lone] });
    expect(decisionFor(result, lone.sender_item_id).decision).toBe("PAY");
  });

  it("does not hard-link an implausibly busy device (a café tablet) into one giant group", () => {
    // 20 unrelated people, each with their own address/IP, who all happen to
    // tap the same public tablet once. No other signal connects any pair.
    const cafeGoers: PayoutItem[] = Array.from({ length: 20 }, (_, i) =>
      item(`cafe${i}`, `person${i}@outlook.com`, {
        device_hash: "d_cafe_tablet",
        ip_prefix: `10.${80 + i}.0.0/24`,
        signup_at: iso(2000 + i * 3),
        onboarding_seconds: 400,
        activity_after_onboarding: 4,
      }),
    );

    const result = scoreRun({ sender_batch_header: { sender_batch_id: "test_cafe_tablet" }, items: cafeGoers });
    for (const it of cafeGoers) {
      expect(decisionFor(result, it.sender_item_id).decision).toBe("PAY");
    }
  });

  it("does not join two accounts on one soft link alone (a shared café Wi-Fi)", () => {
    const a = item("cafeA", "guest.a@gmail.com", {
      ip_prefix: "10.70.0.0/24",
      signup_at: iso(0),
      onboarding_seconds: 30,
      activity_after_onboarding: 0,
    });
    const b = item("cafeB", "guest.b@yahoo.com", {
      ip_prefix: "10.70.0.0/24", // same /24 ...
      signup_at: iso(5), // ... within the 30-minute window: one soft link only
      onboarding_seconds: 30,
      activity_after_onboarding: 0,
    });

    const result = scoreRun({ sender_batch_header: { sender_batch_id: "test_cafe" }, items: [a, b] });
    // One soft link (0.35) is below the 0.5 floor, so no edge forms and both
    // accounts are isolated communities of size 1 — never held together.
    expect(decisionFor(result, a.sender_item_id).decision).toBe("PAY");
    expect(decisionFor(result, b.sender_item_id).decision).toBe("PAY");
  });
});
