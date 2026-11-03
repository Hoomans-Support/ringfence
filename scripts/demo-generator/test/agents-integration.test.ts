/**
 * Task 6's done-when, end to end: investigate the real week 1 ring, check its claims, and confirm
 * the case file shows "N of N claims checked" on honest data the engine actually held.
 */
import { checkClaims, investigate } from "@ringfence/agents";
import { scoreRun } from "@ringfence/engine";
import { describe, expect, it } from "vitest";
import { generateWeek1 } from "../src/week1";

describe("investigate + checkClaims on the real week 1 ring", () => {
  it("writes a case file for ring R-01 where every claim checks out", () => {
    const { run } = generateWeek1(42);
    const { rings } = scoreRun(run);

    const ring = rings.find((r) => r.size === 23);
    expect(ring).toBeDefined();
    if (!ring) return;

    const caseFile = checkClaims(investigate(ring, run), run);

    expect(caseFile.claims.length).toBeGreaterThan(0);
    expect(caseFile.claims_checked.checked).toBe(caseFile.claims_checked.total);
    expect(caseFile.claims.every((c) => c.checked === true)).toBe(true);

    // The claims should actually mention what the demo generator built the ring out of: a shared
    // device, a tight signup window, fast onboarding, silence afterward, and a patterned address.
    const kinds = new Set(caseFile.claims.map((c) => c.check.kind));
    expect(kinds.has("shared_device")).toBe(true);
    expect(kinds.has("signup_window")).toBe(true);
    expect(kinds.has("onboarding_speed")).toBe(true);
    expect(kinds.has("quiet_after_onboarding")).toBe(true);
    expect(kinds.has("alias_pattern")).toBe(true);

    expect(caseFile.proposed_rule.source).toBe(`ring ${ring.ring_id}`);
    expect(caseFile.proposed_rule.action).toBe("HOLD");
  });
});
