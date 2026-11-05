// Ringfence numbers learned rules itself: a new proposal gets the program's next rule number and
// names the ring and run it was learned from; only a revision names an existing rule.
import { describe, expect, it } from "vitest";
import { ensureProgram, migrate } from "../src/db";
import { auth, setup, week1 } from "./helpers";

const named = (id: string) => ({ ...week1, sender_batch_header: { ...week1.sender_batch_header, sender_batch_id: id } });

// What the investigator proposes: it suggests an id derived from its ring, which Ringfence ignores.
const proposal = (suggestedId: string) => ({
  id: suggestedId,
  action: "HOLD",
  when: { all: [
    { signal: "signup_burst", same: "referrer", window_min: 30, min_accounts: 5 },
    { signal: "onboarding_seconds", max: 120 },
    { signal: "activity_after_onboarding", max: 0 },
  ] },
});

async function program(headers = auth, opts: { firstRuleNumber?: number } = {}) {
  const ctx = await setup();
  if (opts.firstRuleNumber) await ensureProgram(ctx.db, "demo", "Demo", "demo-key", undefined, opts);
  const h = opts.firstRuleNumber ? { authorization: "Bearer demo-key" } : headers;
  const post = (url: string, payload: object) => ctx.app.inject({ method: "POST", url, headers: h, payload });
  const get = (url: string) => ctx.app.inject({ url, headers: h });
  return { ...ctx, post, get };
}

describe("learned rule numbers", () => {
  it("a proposal gets Ringfence's number, and that number approves it", async () => {
    const { post } = await program();
    await post("/v1/payout-runs", named("run_a"));
    const proposed = await post("/v1/rules", { rule: proposal("R-01"), learned_from: { ring_id: "R-01", run_id: "run_a" } });
    expect(proposed.statusCode).toBe(201);
    expect(proposed.json()).toMatchObject({ rule_id: "R-01", version: 1, learned_from: { ring_id: "R-01", run_id: "run_a" } });
    const approved = (await post("/v1/rules/R-01/approve", { approved_by: "rina@budgetapp.test", acknowledge_flags: true })).json();
    expect(approved).toMatchObject({ rule_id: "R-01", status: "approved" });
  });

  it("rules learned from two runs' rings get different numbers, even when the investigator suggests the same id", async () => {
    const { post } = await program();
    await post("/v1/payout-runs", named("run_a")); // its ring is R-01
    await post("/v1/payout-runs", named("run_b")); // its ring is R-02
    const first = (await post("/v1/rules", { rule: proposal("R-01"), learned_from: { ring_id: "R-01", run_id: "run_a" } })).json();
    const second = (await post("/v1/rules", { rule: proposal("R-01"), learned_from: { ring_id: "R-02", run_id: "run_b" } })).json();
    expect([first.rule_id, first.version, second.rule_id, second.version]).toEqual(["R-01", 1, "R-02", 1]);
    expect(first.learned_from).toEqual({ ring_id: "R-01", run_id: "run_a" });
    expect(second.learned_from).toEqual({ ring_id: "R-02", run_id: "run_b" });
  });

  it("revising a rule adds a version, and approving it applies the new version to later runs", async () => {
    const { post } = await program();
    await post("/v1/payout-runs", named("run_a"));
    await post("/v1/rules", { rule: proposal("R-01"), learned_from: { ring_id: "R-01", run_id: "run_a" } });
    const quietOnly = { ...proposal("ignored"), when: { all: proposal("x").when.all.filter((c) => c.signal !== "onboarding_seconds") } };
    const revised = (await post("/v1/rules", { rule: quietOnly, revises: "R-01" })).json();
    expect(revised).toMatchObject({ rule_id: "R-01", version: 2, learned_from: { ring_id: "R-01", run_id: "run_a" } });
    await post("/v1/rules/R-01/approve", { approved_by: "rina@budgetapp.test", acknowledge_flags: true });
    expect((await post("/v1/payout-runs", named("run_c"))).json().rule_set_version).toBe("starter-1+R-01v2");
  });

  it("a proposal can't pick a new rule's number", async () => {
    const { post } = await program();
    await post("/v1/payout-runs", named("run_a"));
    expect((await post("/v1/rules", { rule: proposal("R-42"), learned_from: { ring_id: "R-01", run_id: "run_a" } })).json().rule_id).toBe("R-01");
    expect((await post("/v1/rules", { rule: proposal("R-42"), revises: "R-42" })).statusCode).toBe(404);
  });

  it("a new rule must name a ring that really was held in that run", async () => {
    const { post } = await program();
    await post("/v1/payout-runs", named("run_a"));
    expect((await post("/v1/rules", { rule: proposal("R-01") })).statusCode).toBe(400);
    expect((await post("/v1/rules", { rule: proposal("R-01"), learned_from: { ring_id: "R-09", run_id: "run_a" } })).statusCode).toBe(404);
    expect((await post("/v1/rules", { rule: proposal("R-01"), learned_from: { ring_id: "R-01", run_id: "no_such_run" } })).statusCode).toBe(404);
  });

  it("a program created with a starting rule number of 7 gives its first learned rule R-07", async () => {
    const { post } = await program(auth, { firstRuleNumber: 7 });
    await post("/v1/payout-runs", named("run_a"));
    expect((await post("/v1/rules", { rule: proposal("R-01"), learned_from: { ring_id: "R-01", run_id: "run_a" } })).json().rule_id).toBe("R-07");
  });

  it("the rules list shows each rule's source ring and run, approver, backtest and red-team score", async () => {
    const { post, get } = await program();
    await post("/v1/payout-runs", named("run_a"));
    await post("/v1/rings/R-01/confirm", { run_id: "run_a" });
    await post("/v1/rules", { rule: proposal("R-01"), learned_from: { ring_id: "R-01", run_id: "run_a" } });
    await post("/v1/rules/R-01/approve", { approved_by: "rina@budgetapp.test", acknowledge_flags: true });
    const [rule] = (await get("/v1/rules")).json();
    expect(rule).toMatchObject({
      rule_id: "R-01",
      learned_from: { ring_id: "R-01", run_id: "run_a" },
      approved_by: "rina@budgetapp.test",
      backtest: { caught: 23 },
      red_team: { variants: 200 },
    });
    expect(rule.body.source).toBe("ring R-01 in run run_a");
  });

  it("a program whose rules were numbered before the counter existed never reuses a rule number", async () => {
    const { post, db } = await program();
    await post("/v1/payout-runs", named("run_a"));
    await post("/v1/rules", { rule: proposal("R-01"), learned_from: { ring_id: "R-01", run_id: "run_a" } });
    await db.exec("RESET ROLE; UPDATE programs SET next_rule_number = 1 WHERE id = 'budgetapp';");
    await migrate(db);
    await db.exec("SET ROLE ringfence_app");
    expect((await post("/v1/rules", { rule: proposal("R-01"), learned_from: { ring_id: "R-01", run_id: "run_a" } })).json().rule_id).toBe("R-02");
  });
});
