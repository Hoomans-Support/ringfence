import type { PayoutItem, PayoutRun, RingSummary } from "@ringfence/engine";
import { describe, expect, it } from "vitest";
import { checkClaims } from "../src/check-claims";
import { investigate } from "../src/investigate";
import type { CaseFile } from "../src/types";

function item(id: string, overrides: Partial<PayoutItem["context"]> = {}): PayoutItem {
  return {
    recipient_type: "EMAIL",
    receiver: `${id}@gmail.com`,
    amount: { value: "20.00", currency: "USD" },
    sender_item_id: `ref_${id}`,
    context: {
      account_id: `u_${id}`,
      signup_at: "2026-11-01T10:00:00Z",
      device_hash: "d_ring",
      ip_prefix: "10.0.0.0/24",
      onboarding_seconds: 90,
      activity_after_onboarding: 0,
      referrer_id: "u_ref",
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

const run: PayoutRun = {
  sender_batch_header: { sender_batch_id: "t" },
  items: [item("a"), item("b"), item("c")],
};

describe("checkClaims", () => {
  it("confirms every claim on a case file whose evidence is actually true", () => {
    const caseFile = investigate(ring, run);
    const checked = checkClaims(caseFile, run);

    expect(checked.claims.length).toBeGreaterThan(0);
    expect(checked.claims.every((c) => c.checked === true)).toBe(true);
    expect(checked.claims_checked).toEqual({ checked: checked.claims.length, total: checked.claims.length });
  });

  it("flags a claim as unchecked when its cited evidence doesn't hold — not a rubber stamp", () => {
    const caseFile = investigate(ring, run);
    // Tamper with one claim the way a wrong LLM-written claim would be wrong: assert a device
    // hash the cited accounts don't actually share.
    const tampered: CaseFile = {
      ...caseFile,
      claims: caseFile.claims.map((c) =>
        c.check.kind === "shared_device" ? { ...c, check: { ...c.check, device_hash: "d_not_real" } } : c,
      ),
    };

    const result = checkClaims(tampered, run);
    const deviceClaim = result.claims.find((c) => c.check.kind === "shared_device");
    expect(deviceClaim?.checked).toBe(false);
    expect(result.claims_checked.checked).toBeLessThan(result.claims_checked.total);
  });

  it("flags a claim as unchecked when it names an account that was never in the run", () => {
    const caseFile = investigate(ring, run);
    const tampered: CaseFile = {
      ...caseFile,
      claims: caseFile.claims.map((c) => ({ ...c, check: { ...c.check, account_ids: ["u_nonexistent"] } })),
    };

    const result = checkClaims(tampered, run);
    expect(result.claims.every((c) => c.checked === false)).toBe(true);
    expect(result.claims_checked.checked).toBe(0);
  });

  it("is independent per claim: one false claim doesn't fail the others", () => {
    const caseFile = investigate(ring, run);
    const tampered: CaseFile = {
      ...caseFile,
      claims: caseFile.claims.map((c, i) => (i === 0 ? { ...c, check: { ...c.check, account_ids: ["u_nope"] } } : c)),
    };

    const result = checkClaims(tampered, run);
    expect(result.claims[0]?.checked).toBe(false);
    expect(result.claims.slice(1).every((c) => c.checked === true)).toBe(true);
  });
});
