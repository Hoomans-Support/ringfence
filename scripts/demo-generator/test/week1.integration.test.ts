/**
 * The end-to-end check behind both task 1 and task 3's "done when": feed
 * the generated week 1 fixture through the real scoreRun and confirm the
 * ring is held as one, the roommates as a pair, and the coworkers paid —
 * without the test ever telling the engine which group is which.
 */
import { scoreRun } from "@ringfence/engine";
import { describe, expect, it } from "vitest";
import { generateWeek1 } from "../src/week1";

describe("week 1 through scoreRun", () => {
  it("holds the 23-account ring as one ring", () => {
    const { run, truth } = generateWeek1(42);
    const result = scoreRun(run);

    const ringAccountIds = new Set(truth.filter((t) => t.group === "ring").map((t) => t.account_id));
    const ringDecisions = result.decisions.filter((d) => {
      const accountId = run.items.find((it) => it.sender_item_id === d.sender_item_id)?.context.account_id;
      return accountId ? ringAccountIds.has(accountId) : false;
    });

    expect(ringDecisions.length).toBe(23);
    expect(ringDecisions.every((d) => d.decision === "HOLD")).toBe(true);
    const ringIds = new Set(ringDecisions.map((d) => d.ring_id));
    expect(ringIds.size).toBe(1);

    const ring = result.rings.find((r) => r.ring_id === [...ringIds][0]);
    expect(ring?.size).toBe(23);
  });

  it("holds the roommates as a pair, not a ring", () => {
    const { run, truth } = generateWeek1(42);
    const result = scoreRun(run);

    const roommateAccountIds = new Set(truth.filter((t) => t.group === "roommates").map((t) => t.account_id));
    const roommateDecisions = result.decisions.filter((d) => {
      const accountId = run.items.find((it) => it.sender_item_id === d.sender_item_id)?.context.account_id;
      return accountId ? roommateAccountIds.has(accountId) : false;
    });

    expect(roommateDecisions.length).toBe(2);
    expect(roommateDecisions.every((d) => d.decision === "HOLD")).toBe(true);
    expect(roommateDecisions.every((d) => d.ring_id === undefined)).toBe(true);
    const holdGroupIds = new Set(roommateDecisions.map((d) => d.hold_group_id));
    expect(holdGroupIds.size).toBe(1);
  });

  it("pays the coworkers", () => {
    const { run, truth } = generateWeek1(42);
    const result = scoreRun(run);

    const coworkerAccountIds = new Set(truth.filter((t) => t.group === "coworkers").map((t) => t.account_id));
    const coworkerDecisions = result.decisions.filter((d) => {
      const accountId = run.items.find((it) => it.sender_item_id === d.sender_item_id)?.context.account_id;
      return accountId ? coworkerAccountIds.has(accountId) : false;
    });

    expect(coworkerDecisions.length).toBe(5);
    expect(coworkerDecisions.every((d) => d.decision === "PAY")).toBe(true);
  });

  it("pays 387 and holds 25 overall, matching the PRD's week 1 numbers", () => {
    const { run } = generateWeek1(42);
    const result = scoreRun(run);
    const paid = result.decisions.filter((d) => d.decision === "PAY").length;
    const held = result.decisions.filter((d) => d.decision === "HOLD").length;
    expect(paid).toBe(387);
    expect(held).toBe(25);
  });
});
