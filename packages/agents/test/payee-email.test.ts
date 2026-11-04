import { describe, expect, it } from "vitest";
import { holdEmailCopy, releaseEmailCopy } from "../src/payee-email";

// design.md's Voice table, "Words we avoid" - plus the words that would tell a payee they're
// under investigation at all, which FR-24's "never accuses the payee" requires going further
// than the staff-facing console does.
const ACCUSATORY_WORDS = [
  "blocked",
  "banned",
  "scammer",
  "criminal",
  "suspicious",
  "threat",
  "fraud",
  "ring",
  "accus",
  "investigat",
  "flagged",
  "violat",
];

function assertNeverAccuses(email: { subject: string; body: string }): void {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  for (const word of ACCUSATORY_WORDS) {
    expect(text).not.toContain(word);
  }
}

const AMOUNT = { value: "20.00", currency: "USD" };

describe("holdEmailCopy", () => {
  it("never accuses the payee", () => {
    assertNeverAccuses(holdEmailCopy(AMOUNT));
  });

  it("still tells the payee their real amount, so the email isn't content-free", () => {
    expect(holdEmailCopy(AMOUNT).body).toContain("20.00 USD");
  });
});

describe("releaseEmailCopy", () => {
  it("never accuses the payee", () => {
    assertNeverAccuses(releaseEmailCopy(AMOUNT));
  });

  it("still tells the payee their real amount", () => {
    expect(releaseEmailCopy(AMOUNT).body).toContain("20.00 USD");
  });
});
