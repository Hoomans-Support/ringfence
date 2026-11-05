// Permanent ring, pair and rule identity (GitHub issue #1 and its sub-issues #2-#4, #6). budgetapp
// and surveyapp (helpers.ts) are left at their default start-at-1 numbering, since the rest of the
// suite hardcodes R-01/R-07 against them — these tests create their own programs instead, so the
// numbering behaviour itself (persistence, independence, seeding) can be exercised directly.
import { describe, expect, it } from "vitest";
import { ensureProgram } from "../src/db";
import { setup } from "./helpers";

type App = Awaited<ReturnType<typeof setup>>["app"];
const post = (app: App, url: string, payload: unknown, key: string) => app.inject({ method: "POST", url, headers: { authorization: `Bearer ${key}` }, payload: payload as object });
const get = (app: App, url: string, key: string) => app.inject({ url, headers: { authorization: `Bearer ${key}` } });
const ringIdOf = (run: { decisions: Array<{ ring_id?: string }> }) => run.decisions.find((d) => d.ring_id)?.ring_id;

const BASE = Date.parse("2026-11-02T09:00:00Z");

/** 3 accounts sharing one device, all risk-flagged: scoreRun's smallest ring. */
function ringBody(batchId: string, seed: string) {
  return {
    sender_batch_header: { sender_batch_id: batchId },
    items: [0, 1, 2].map((i) => ({
      recipient_type: "EMAIL",
      receiver: `${seed}.ring${i}@example.test`,
      amount: { value: "20.00", currency: "USD" },
      sender_item_id: `${seed}_r${i}`,
      context: {
        account_id: `${seed}_ru${i}`,
        signup_at: new Date(BASE + i * 60_000).toISOString(),
        device_hash: `${seed}_rdevice`,
        ip_prefix: "10.40.0.0/24",
        onboarding_seconds: 90,
        activity_after_onboarding: 0,
      },
    })),
  };
}

/** 2 accounts sharing one device, both risk-flagged: scoreRun's pair case. */
function pairBody(batchId: string, seed: string) {
  return {
    sender_batch_header: { sender_batch_id: batchId },
    items: [0, 1].map((i) => ({
      recipient_type: "EMAIL",
      receiver: `${seed}.pair${i}@example.test`,
      amount: { value: "20.00", currency: "USD" },
      sender_item_id: `${seed}_p${i}`,
      context: {
        account_id: `${seed}_pu${i}`,
        signup_at: new Date(BASE + i * 60_000).toISOString(),
        device_hash: `${seed}_pdevice`,
        ip_prefix: "10.41.0.0/24",
        onboarding_seconds: 90,
        activity_after_onboarding: 0,
      },
    })),
  };
}

describe("permanent ring/pair numbering (issue #2)", () => {
  it("a fresh program's two runs give R-01 then R-02, agreeing with the ring explanation; pairs advance the same way", async () => {
    const { db, app } = await setup();
    await ensureProgram(db, "freshapp", "Fresh app", "fresh-key");

    const run1 = (await post(app, "/v1/payout-runs", ringBody("run_a", "a"), "fresh-key")).json();
    expect(ringIdOf(run1)).toBe("R-01");
    expect((await get(app, "/v1/rings/R-01?run_id=run_a", "fresh-key")).json()).toMatchObject({ ring_id: "R-01", size: 3 });

    const run2 = (await post(app, "/v1/payout-runs", ringBody("run_b", "b"), "fresh-key")).json();
    expect(ringIdOf(run2)).toBe("R-02");

    const pair1 = (await post(app, "/v1/payout-runs", pairBody("run_c", "c"), "fresh-key")).json();
    expect(pair1.decisions[0].hold_group_id).toBe("P-01");
    const pair2 = (await post(app, "/v1/payout-runs", pairBody("run_d", "d"), "fresh-key")).json();
    expect(pair2.decisions[0].hold_group_id).toBe("P-02");
  });

  it("a screen predicts the number the run that follows it gets, without consuming it", async () => {
    const { db, app } = await setup();
    await ensureProgram(db, "screenapp", "Screen app", "screen-key");

    const body = ringBody("run_screen", "s");
    expect(ringIdOf((await post(app, "/v1/screen", body, "screen-key")).json())).toBe("R-01");
    // Screening again still predicts R-01: a screen never advances the program's counters.
    expect(ringIdOf((await post(app, "/v1/screen", body, "screen-key")).json())).toBe("R-01");
    expect(ringIdOf((await post(app, "/v1/payout-runs", body, "screen-key")).json())).toBe("R-01");
  });

  it("two programs number independently", async () => {
    const { db, app } = await setup();
    await ensureProgram(db, "progone", "Program one", "one-key");
    await ensureProgram(db, "progtwo", "Program two", "two-key");

    const one = (await post(app, "/v1/payout-runs", ringBody("run_one", "one"), "one-key")).json();
    const two = (await post(app, "/v1/payout-runs", ringBody("run_two", "two"), "two-key")).json();
    expect(ringIdOf(one)).toBe("R-01");
    expect(ringIdOf(two)).toBe("R-01");
  });
});

describe("learned-rule numbering, its hold group, and demo seeding (issues #3, #4, #6)", () => {
  it("a program seeded with starting numbers 12 and 7 reproduces the demo's R-12 ring and R-07 rule", async () => {
    const { db, app } = await setup();
    await ensureProgram(db, "demoapp", "Demo app", "demo-key", undefined, { startRing: 12, startRule: 7 });

    const run = (await post(app, "/v1/payout-runs", ringBody("run_demo", "d"), "demo-key")).json();
    const ringId = ringIdOf(run);
    expect(ringId).toBe("R-12");

    await post(app, `/v1/rings/${ringId}/confirm`, { run_id: "run_demo" }, "demo-key");
    const rule = { id: "R-99", action: "HOLD", when: { all: [{ signal: "disposable_email" }] } };
    const proposed = (await post(app, "/v1/rules", { rule, source_ring_id: ringId, source_run_id: "run_demo" }, "demo-key")).json();
    // Minted from the program's own counter (seeded at 7), ignoring the submitted "R-99".
    expect(proposed).toMatchObject({ rule_id: "R-07", version: 1, source_ring_id: "R-12", source_run_id: "run_demo" });
  });

  it("a program created without starting numbers still begins at R-01 and rule R-01", async () => {
    const { db, app } = await setup();
    await ensureProgram(db, "plainapp", "Plain app", "plain-key");
    const rule = { id: "R-99", action: "HOLD", when: { all: [{ signal: "disposable_email" }] } };
    const proposed = (await post(app, "/v1/rules", { rule, source_ring_id: "R-01", source_run_id: "run_x" }, "plain-key")).json();
    expect(proposed.rule_id).toBe("R-01");
  });

  it("proposing with an existing rule id creates a new version of that rule, not a new one", async () => {
    const { db, app } = await setup();
    await ensureProgram(db, "revapp", "Rev app", "rev-key");
    const rule = { id: "R-99", action: "HOLD", when: { all: [{ signal: "disposable_email" }] } };

    const first = (await post(app, "/v1/rules", { rule, source_ring_id: "R-01", source_run_id: "run_x" }, "rev-key")).json();
    expect(first).toMatchObject({ rule_id: "R-01", version: 1 });

    const revised = (await post(app, "/v1/rules", { rule: { ...rule, id: "R-01" }, source_ring_id: "R-01", source_run_id: "run_y" }, "rev-key")).json();
    expect(revised).toMatchObject({ rule_id: "R-01", version: 2 });

    // A fresh proposal (the submitted id still doesn't match an existing rule): a new counter slot.
    const second = (await post(app, "/v1/rules", { rule, source_ring_id: "R-01", source_run_id: "run_x" }, "rev-key")).json();
    expect(second).toMatchObject({ rule_id: "R-02", version: 1 });
  });

  it("a rule-only hold group is rule:<id>, carries no ring_id, and release/confirm never cross into a same-named ring", async () => {
    const { db, app } = await setup();
    await ensureProgram(db, "collideapp", "Collide app", "collide-key");

    // This program's first rule becomes R-01.
    const rule = { id: "R-99", action: "HOLD", when: { all: [{ signal: "disposable_email" }] } };
    const proposed = (await post(app, "/v1/rules", { rule, source_ring_id: "R-01", source_run_id: "seed_run" }, "collide-key")).json();
    expect(proposed.rule_id).toBe("R-01");
    await post(app, "/v1/rules/R-01/approve", { approved_by: "a@collideapp.test" }, "collide-key");

    // This program's first ring, in a later run, is also R-01 — the exact collision issue #4 guards against.
    const ringRun = (await post(app, "/v1/payout-runs", ringBody("run_ring", "cr"), "collide-key")).json();
    expect(ringIdOf(ringRun)).toBe("R-01");

    // A disposable-email payee with no graph link: held only by the rule, never the ring.
    const ruleOnlyId = "run_rule_only";
    const ruleOnly = {
      sender_batch_header: { sender_batch_id: ruleOnlyId },
      items: [
        {
          recipient_type: "EMAIL",
          receiver: "lone@mailinator.com",
          amount: { value: "5.00", currency: "USD" },
          sender_item_id: "lone_1",
          context: { account_id: "u_lone", signup_at: new Date(BASE).toISOString(), device_hash: "d_lone", ip_prefix: "10.77.0.0/24" },
        },
      ],
    };
    const decided = (await post(app, "/v1/payout-runs", ruleOnly, "collide-key")).json();
    expect(decided.decisions[0]).toMatchObject({ decision: "HOLD", hold_group_id: "rule:R-01" });
    expect(decided.decisions[0].ring_id).toBeUndefined();

    // Confirming ring R-01 blocks only the ring's 3 members; the rule-only item stays untouched.
    const confirmedRing = (await post(app, "/v1/rings/R-01/confirm", { run_id: "run_ring" }, "collide-key")).json();
    expect(confirmedRing).toMatchObject({ ring_id: "R-01", blocked: 3 });
    const stillHeld = (await get(app, `/v1/payout-runs/${ruleOnlyId}`, "collide-key")).json();
    expect(stillHeld.decisions[0].state).toBe("held");

    // Releasing rule:R-01 pays the rule-only item; the ring's now-blocked members stay untouched.
    const release = (await post(app, "/v1/holds/release", { run_id: ruleOnlyId, hold_group_id: "rule:R-01" }, "collide-key")).json();
    expect(release.released).toEqual(["lone_1"]);
    const ringAfter = (await get(app, "/v1/payout-runs/run_ring", "collide-key")).json();
    expect(ringAfter.decisions.every((d: { state: string }) => d.state === "blocked")).toBe(true);
  });
});
