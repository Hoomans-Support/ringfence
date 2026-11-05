// A payout's outcome is PayPal's word for it (succeeded, unclaimed, returned, failed); "paid" only
// means sent on time, the run summary's count. Databases holding the old "paid" state move across.
import { describe, expect, it } from "vitest";
import { MockPayPal } from "@ringfence/paypal";
import { migrate } from "../src/db";
import { pollBatches } from "../src/sync";
import { auth, setup, week1 } from "./helpers";

// Four honest members (the first four after the ring, roommates and coworkers) never claim theirs.
const neverClaims = new Set<string>(week1.items.slice(30, 34).map((i: { receiver: string }) => i.receiver));
const isUnclaimed = (receiver: string) => neverClaims.has(receiver);

async function settledWeek1() {
  const mock = new MockPayPal({ isUnclaimed });
  const ctx = await setup(mock);
  const post = (url: string, payload: object) => ctx.app.inject({ method: "POST", url, headers: auth, payload });
  const get = async (url: string) => (await ctx.app.inject({ url, headers: auth })).json();
  await post("/v1/payout-runs", week1);
  await pollBatches(ctx.db, mock);
  const count = (decisions: Array<{ state: string }>) => decisions.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.state]: (acc[d.state] ?? 0) + 1 }), {});
  return { ...ctx, mock, post, get, count };
}

describe("payout outcomes", () => {
  it("a payout PayPal reports as succeeded reads as succeeded, in the run and in a hold group's explanation", async () => {
    const { post, get, count, db, mock } = await settledWeek1();
    const run = await get("/v1/payout-runs/run_2026w45");
    expect(count(run.decisions)).toEqual({ succeeded: 383, unclaimed: 4, held: 25 });

    await post("/v1/holds/release", { run_id: "run_2026w45", hold_group_id: "P-01" });
    await pollBatches(db, mock);
    const pair = await get("/v1/rings/P-01?run_id=run_2026w45");
    expect(pair.members.map((m: { state: string }) => m.state)).toEqual(["succeeded", "succeeded"]);
  });

  it("the summary's paid count is the payouts sent on time, whatever their outcome", async () => {
    const { get } = await settledWeek1();
    const run = await get("/v1/payout-runs/run_2026w45");
    expect(run.summary).toMatchObject({ paid: 387, held: 25, blocked: 0, paid_usd: 7740 });
  });

  it("a database holding payouts in the old \"paid\" state reads them as succeeded after the startup schema step, and running it again is harmless", async () => {
    const { db, get, count } = await settledWeek1();
    // Put the database back the way it was before the rename: the old constraint, the old word.
    await db.exec(`RESET ROLE;
      ALTER TABLE items DROP CONSTRAINT items_state_check;
      UPDATE items SET state = 'paid' WHERE state = 'succeeded';
      ALTER TABLE items ADD CONSTRAINT items_state_check CHECK (state IN ('held', 'blocked', 'queued', 'sent', 'paid', 'unclaimed', 'returned', 'failed'));`);

    await migrate(db);
    await migrate(db);
    await db.exec("SET ROLE ringfence_app");
    expect(count((await get("/v1/payout-runs/run_2026w45")).decisions)).toEqual({ succeeded: 383, unclaimed: 4, held: 25 });
    // And the old word can't come back.
    await expect(
      db.tx(async (q) => {
        await q.query("SELECT set_config('app.program_id', 'budgetapp', true)");
        await q.query("UPDATE items SET state = 'paid' WHERE state = 'succeeded'");
      }),
    ).rejects.toThrow(/items_state_check/);
  });
});
