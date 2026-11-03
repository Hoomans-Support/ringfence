import type { PayoutItem, PayoutRun, RingSummary } from "@ringfence/engine";
import { describe, expect, it } from "vitest";
import { investigate } from "../src/investigate";

function item(id: string, overrides: Partial<PayoutItem["context"]> = {}, receiver?: string): PayoutItem {
  return {
    recipient_type: "EMAIL",
    receiver: receiver ?? `${id}@gmail.com`,
    amount: { value: "20.00", currency: "USD" },
    sender_item_id: `ref_${id}`,
    context: {
      account_id: `u_${id}`,
      signup_at: "2026-11-01T10:00:00Z",
      device_hash: `d_${id}`,
      ip_prefix: "10.0.0.0/24",
      ...overrides,
    },
  };
}

const ring: RingSummary = {
  ring_id: "R-01",
  member_sender_item_ids: ["ref_a", "ref_b", "ref_c"],
  size: 3,
  reasons: [],
  louvain_clusters: 1,
};

describe("investigate", () => {
  it("writes a shared-device claim naming the right accounts, and a matching check", () => {
    const run: PayoutRun = {
      sender_batch_header: { sender_batch_id: "t" },
      items: [
        item("a", { device_hash: "d_ring" }),
        item("b", { device_hash: "d_ring" }),
        item("c", { device_hash: "other" }),
      ],
    };

    const caseFile = investigate(ring, run);
    const deviceClaim = caseFile.claims.find((c) => c.check.kind === "shared_device");

    expect(deviceClaim?.text).toBe("Accounts a and b used device d_ring.");
    expect(deviceClaim?.check).toEqual({ kind: "shared_device", account_ids: ["u_a", "u_b"], device_hash: "d_ring" });
    expect(deviceClaim?.checked).toBeUndefined(); // not checked yet — that's checkClaims' job
  });

  it("writes a signup-window claim covering all members, with the real spread", () => {
    const run: PayoutRun = {
      sender_batch_header: { sender_batch_id: "t" },
      items: [
        item("a", { signup_at: "2026-11-01T10:00:00Z" }),
        item("b", { signup_at: "2026-11-01T10:05:00Z" }),
        item("c", { signup_at: "2026-11-01T10:09:00Z" }),
      ],
    };

    const caseFile = investigate(ring, run);
    const windowClaim = caseFile.claims.find((c) => c.check.kind === "signup_window");
    expect(windowClaim?.check.window_minutes).toBe(9);
    expect(windowClaim?.text).toContain("3 accounts signed up within 9 minutes");
  });

  it("only writes the onboarding-speed claim when it's true of every member", () => {
    const fast: PayoutRun = {
      sender_batch_header: { sender_batch_id: "t" },
      items: [
        item("a", { onboarding_seconds: 60 }),
        item("b", { onboarding_seconds: 90 }),
        item("c", { onboarding_seconds: 110 }),
      ],
    };
    expect(investigate(ring, fast).claims.some((c) => c.check.kind === "onboarding_speed")).toBe(true);

    const mixed: PayoutRun = {
      sender_batch_header: { sender_batch_id: "t" },
      items: [item("a", { onboarding_seconds: 60 }), item("b"), item("c", { onboarding_seconds: 90 })],
    };
    expect(investigate(ring, mixed).claims.some((c) => c.check.kind === "onboarding_speed")).toBe(false);
  });

  it("only writes the quiet-after-onboarding claim when every member is quiet", () => {
    const quiet: PayoutRun = {
      sender_batch_header: { sender_batch_id: "t" },
      items: [
        item("a", { activity_after_onboarding: 0 }),
        item("b", { activity_after_onboarding: 0 }),
        item("c", { activity_after_onboarding: 0 }),
      ],
    };
    expect(investigate(ring, quiet).claims.some((c) => c.check.kind === "quiet_after_onboarding")).toBe(true);

    const active: PayoutRun = {
      sender_batch_header: { sender_batch_id: "t" },
      items: [
        item("a", { activity_after_onboarding: 0 }),
        item("b", { activity_after_onboarding: 2 }),
        item("c", { activity_after_onboarding: 0 }),
      ],
    };
    expect(investigate(ring, active).claims.some((c) => c.check.kind === "quiet_after_onboarding")).toBe(false);
  });

  it("writes an alias-pattern claim for a shared naming pattern, not for unrelated emails", () => {
    const patterned: PayoutRun = {
      sender_batch_header: { sender_batch_id: "t" },
      items: [item("a", {}, "ring01@gmail.com"), item("b", {}, "ring02@gmail.com"), item("c", {}, "ring03@gmail.com")],
    };
    expect(investigate(ring, patterned).claims.some((c) => c.check.kind === "alias_pattern")).toBe(true);

    const unrelated: PayoutRun = {
      sender_batch_header: { sender_batch_id: "t" },
      items: [item("a", {}, "alice@gmail.com"), item("b", {}, "bob@yahoo.com"), item("c", {}, "carol@outlook.com")],
    };
    expect(investigate(ring, unrelated).claims.some((c) => c.check.kind === "alias_pattern")).toBe(false);
  });

  it("proposes a rule from the claims that hold for every member, sourced to the ring", () => {
    const run: PayoutRun = {
      sender_batch_header: { sender_batch_id: "t" },
      items: [
        item("a", { onboarding_seconds: 90, activity_after_onboarding: 0, referrer_id: "u_ref" }),
        item("b", { onboarding_seconds: 100, activity_after_onboarding: 0, referrer_id: "u_ref" }),
        item("c", { onboarding_seconds: 80, activity_after_onboarding: 0, referrer_id: "u_ref" }),
      ],
    };

    const { proposed_rule } = investigate(ring, run);
    expect(proposed_rule.id).toBe("R-01");
    expect(proposed_rule.action).toBe("HOLD");
    expect(proposed_rule.source).toBe("ring R-01");
    expect(proposed_rule.when.all).toContainEqual({ signal: "onboarding_seconds", max: 100 });
    expect(proposed_rule.when.all).toContainEqual({ signal: "activity_after_onboarding", max: 0 });
    expect(proposed_rule.when.all.some((c) => c.signal === "signup_burst")).toBe(true);
    // Not filled in by the investigator itself — those are A's backtester, our red team, and a
    // person's approval, in that order.
    expect(proposed_rule.backtest).toBeUndefined();
    expect(proposed_rule.red_team).toBeUndefined();
    expect(proposed_rule.approved_by).toBeUndefined();
  });

  it("sets claims_checked to 0 of N before checkClaims runs", () => {
    const run: PayoutRun = {
      sender_batch_header: { sender_batch_id: "t" },
      items: [item("a"), item("b"), item("c")],
    };
    const caseFile = investigate(ring, run);
    expect(caseFile.claims_checked.checked).toBe(0);
    expect(caseFile.claims_checked.total).toBe(caseFile.claims.length);
    expect(caseFile.claims.length).toBeGreaterThan(0);
  });
});
