import { describe, expect, it } from "vitest";
import { buildDemo } from "../lib/demo";
import { deriveFindings } from "../lib/findings";

describe("deriveFindings", () => {
  it("reads the roommate pair as two active people on one laptop", () => {
    const pair = buildDemo(1, false).cases.find((c) => c.name === "Group 13")!;
    expect(deriveFindings(pair.members).map((f) => f.text)).toEqual([
      "Both signed in from one laptop",
      "Signed up 4 hours apart",
      "Both finished sign-up in under 2 minutes",
      "But they kept using the app afterwards",
      "And they used different networks",
    ]);
  });

  it("gives a ring its checked case file instead", () => {
    const ring = buildDemo(1, false).cases.find((c) => c.name === "Group 12")!;
    expect(ring.caseFile?.claims_checked).toEqual({ checked: 8, total: 8 });
  });
});

describe("buildDemo", () => {
  it("week 1 gives the designer's four cases from the real fixtures, fraud first", () => {
    const d = buildDemo(1, false);
    expect([d.payees, d.paid, d.paidUsd]).toEqual([412, 387, 7740]);
    const summary = d.cases.map((c) => [c.name ?? c.title, c.kind, c.verdict, c.size, c.usd, c.dueAt?.slice(0, 10)]);
    expect(summary).toEqual([
      ["Group 12", "group", "fraud", 23, 460, "2026-11-06"],
      ["Group 13", "group", "real", 2, 40, "2026-11-07"],
      ["9 accounts linked to Group 12", "second", "fraud", 9, 180, undefined],
      ["5 accounts, one referrer", "second", "real", 5, 100, undefined],
    ]);
    expect(d.cases[0]!.facts.map((f) => f.text)).toEqual(["1 referrer", "3 shared devices", "12-min burst"]);
    // The learned rule only exists once Group 12 is marked as fraud.
    expect(d.rules.map((r) => [r.key, r.base, r.fromCase])).toEqual([["referral-bursts", "waiting", d.cases[0]!.id]]);
  });

  it("week 3 holds what the selected rule catches and keeps the rest as a second look", () => {
    const d = buildDemo(3, false);
    expect(d.cases.map((c) => [c.kind, c.size])).toEqual([["group", 23], ["second", 89]]);
    expect(buildDemo(3, true).rules.find((r) => r.key === "referral-bursts-v2")?.base).toBe("on");
  });

  it("week 4 is the survey app's run with the six cross-program matches", () => {
    const d = buildDemo(4, false);
    expect(d.network?.accounts).toBe(6);
    expect(d.cases.map((c) => [c.id, c.verdict, c.size])).toEqual([["network:R-12", "fraud", 6]]);
  });
});
