/**
 * Guards the PRD's "Privacy" non-functional requirement at the one place free-text currently
 * leaves the engine: a case file's claims (investigate() is documented as the seam a real model
 * will plug into later - see its own module doc). No claim should ever embed a raw payee email,
 * since that text is exactly what would reach a model once the scripted investigator is replaced.
 */
import { checkClaims, investigate } from "@ringfence/agents";
import { maskEmail, scoreRun } from "@ringfence/engine";
import { describe, expect, it } from "vitest";
import { generateWeek1 } from "../src/week1";

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;

describe("case file privacy", () => {
  it("never puts a raw payee email in a claim's text, on the real week 1 ring with alias-pattern claims", () => {
    const { run } = generateWeek1(42);
    const { rings } = scoreRun(run);
    const ring = rings.find((r) => r.size === 23);
    expect(ring).toBeDefined();
    if (!ring) return;

    const caseFile = checkClaims(investigate(ring, run), run);
    // Sanity check this test actually exercises the one claim kind that touches raw emails -
    // otherwise an empty case file would trivially "pass" without proving anything.
    expect(caseFile.claims.some((c) => c.check.kind === "alias_pattern")).toBe(true);

    for (const claim of caseFile.claims) {
      expect(claim.text).not.toMatch(EMAIL_PATTERN);
    }
  });
});

describe("maskEmail", () => {
  it("is what would stand in for a payee's email if investigate() ever needs to mention one", () => {
    const { run } = generateWeek1(42);
    const email = run.items[0]?.receiver;
    expect(email).toBeDefined();
    if (!email) return;
    expect(maskEmail(email)).not.toMatch(EMAIL_PATTERN);
  });
});
