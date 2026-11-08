// Rings and pairs keep their number for good within a program: a program's runs count on from
// where the last one stopped, a screen shows the next numbers without using them up, and programs
// count independently.
import { describe, expect, it } from "vitest";
import { ensureProgram, migrate } from "../src/db";
import { asBudgetApp, auth, setup, week1 } from "./helpers";

const named = (id: string) => ({ ...week1, sender_batch_header: { ...week1.sender_batch_header, sender_batch_id: id } });

type Decision = { decision: string; ring_id?: string; hold_group_id?: string };
const groupsOf = (decisions: Decision[]) => ({
  rings: [...new Set(decisions.map((d) => d.ring_id).filter(Boolean))],
  pairs: [...new Set(decisions.filter((d) => !d.ring_id && d.hold_group_id?.startsWith("P-")).map((d) => d.hold_group_id))],
});

describe("ring and pair numbers", () => {
  it("count on across a program's runs: R-01 then R-02, P-01 then P-02, everywhere the ring is named", async () => {
    const { app, db } = await setup();
    const a = (await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_a") })).json();
    const b = (await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_b") })).json();
    expect(groupsOf(a.decisions)).toEqual({ rings: ["R-01"], pairs: ["P-01"] });
    expect(groupsOf(b.decisions)).toEqual({ rings: ["R-02"], pairs: ["P-02"] });

    expect((await app.inject({ url: "/v1/rings/R-02?run_id=run_b", headers: auth })).json()).toMatchObject({ ring_id: "R-02", size: 23 });
    expect((await app.inject({ url: "/v1/rings/R-01?run_id=run_b", headers: auth })).statusCode).toBe(404);

    await app.inject({ method: "POST", url: "/v1/rings/R-02/confirm", headers: auth, payload: { run_id: "run_b" } });
    const [logged] = await asBudgetApp<{ detail: { ring_id: string } }>(db, "SELECT detail FROM audit_log WHERE action = 'ring_confirmed'");
    expect(logged?.detail.ring_id).toBe("R-02");
  });

  it("a screen shows the numbers the next run will get, and doesn't use them up", async () => {
    const { app } = await setup();
    await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_a") });
    for (let i = 0; i < 2; i++) {
      const screened = (await app.inject({ method: "POST", url: "/v1/screen", headers: auth, payload: named("run_b") })).json();
      expect(groupsOf(screened.decisions)).toEqual({ rings: ["R-02"], pairs: ["P-02"] });
    }
    const run = (await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_b") })).json();
    expect(groupsOf(run.decisions)).toEqual({ rings: ["R-02"], pairs: ["P-02"] });
  });

  it("resending a run that already exists doesn't move the count", async () => {
    const { app } = await setup();
    await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_a") });
    expect((await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_a") })).statusCode).toBe(200);
    const b = (await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_b") })).json();
    expect(groupsOf(b.decisions).rings).toEqual(["R-02"]);
  });

  it("two programs count independently", async () => {
    const { app } = await setup();
    await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_a") });
    await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_b") });
    const survey = (await app.inject({ method: "POST", url: "/v1/payout-runs", headers: { authorization: "Bearer survey-key" }, payload: named("run_s") })).json();
    expect(groupsOf(survey.decisions)).toEqual({ rings: ["R-01"], pairs: ["P-01"] });
  });

  it("concurrent run submissions reserve distinct ring and pair numbers", async () => {
    const { app } = await setup();
    const [first, second] = await Promise.all([
      app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("race_a") }),
      app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("race_b") }),
    ]);
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    const a = groupsOf(first.json().decisions);
    const b = groupsOf(second.json().decisions);
    expect(new Set([...a.rings, ...b.rings]).size).toBe(2);
    expect(new Set([...a.pairs, ...b.pairs]).size).toBe(2);
    // PGlite serializes its in-memory transactions; this catches regressions in this harness but
    // does not replace exercising PostgreSQL's row lock under real concurrent connections.
  });

  it("a program created with a starting ring number numbers its first ring from it", async () => {
    const { app, db } = await setup();
    await ensureProgram(db, "demo", "Demo budgeting app", "demo-key", undefined, { firstRingNumber: 12 });
    const run = (await app.inject({ method: "POST", url: "/v1/payout-runs", headers: { authorization: "Bearer demo-key" }, payload: named("run_a") })).json();
    expect(groupsOf(run.decisions).rings).toEqual(["R-12"]);
    // Re-creating it (every boot does) never moves its numbering back.
    await ensureProgram(db, "demo", "Demo budgeting app", "demo-key", undefined, { firstRingNumber: 12 });
    const next = (await app.inject({ method: "POST", url: "/v1/payout-runs", headers: { authorization: "Bearer demo-key" }, payload: named("run_b") })).json();
    expect(groupsOf(next.decisions).rings).toEqual(["R-13"]);
  });

  it("confirmed fraud from an earlier ring is still held, confirmed, on sight in a later run whose ring has a new number", async () => {
    const { app } = await setup();
    await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_a") });
    await app.inject({ method: "POST", url: "/v1/rings/R-01/confirm", headers: auth, payload: { run_id: "run_a" } });
    const b = (await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_b") })).json();
    const ring = b.decisions.filter((d: Decision) => d.ring_id === "R-02");
    expect(ring).toHaveLength(23);
    expect(ring.every((d: Decision) => d.decision === "BLOCK")).toBe(true);
  });

  it("a program whose rings were numbered before the counters existed never reuses a number", async () => {
    const { app, db } = await setup();
    await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_a") });
    await db.exec("RESET ROLE; UPDATE programs SET next_ring_number = 1, next_pair_number = 1 WHERE id = 'budgetapp';"); // as before the counters
    await migrate(db);
    await db.exec("SET ROLE ringfence_app");
    const b = (await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: named("run_b") })).json();
    expect(groupsOf(b.decisions)).toEqual({ rings: ["R-02"], pairs: ["P-02"] });
  });
});
