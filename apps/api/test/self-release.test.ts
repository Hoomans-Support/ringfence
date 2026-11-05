import { describe, expect, it } from "vitest";
import { asBudgetApp, auth, setup } from "./helpers";
import { withProgram } from "../src/db";
import { signState, type IdentityProvider } from "../src/paypal-identity";

const key = "test-self-release-key";
const email = "payee@example.test";
const fakeIdentity: IdentityProvider = {
  authorizeUrl: (state) => `https://paypal.test/authorize?state=${encodeURIComponent(state)}`,
  exchangeCode: async () => ({ email }),
};

async function prepared(provider: IdentityProvider = fakeIdentity) {
  const ctx = await setup();
  const app = (await import("../src/server")).buildApp({ db: ctx.db, paypal: ctx.paypal, identityProvider: provider, selfReleaseKey: key });
  const created = await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: {
    sender_batch_header: { sender_batch_id: "self_release_run" },
    items: [{ recipient_type: "EMAIL", receiver: email, amount: { value: "12.00", currency: "USD" }, sender_item_id: "solo_item", context: { account_id: "solo_account", signup_at: "2026-11-05T00:00:00.000Z", device_hash: "unique-device" } }],
  } });
  expect(created.statusCode).toBe(201);
  // Seed a one-person hold after the API has persisted this minimal run; this isolates the
  // self-release eligibility path without turning a ring member or an unrelated graph flag into one.
  await asBudgetApp(ctx.db, "UPDATE items SET state = 'held', batch_id = NULL WHERE sender_item_id = 'solo_item'");
  return { ...ctx, app, runId: created.json().run_id as string };
}

describe("payee self-release", () => {
  it("releases a solo-held payout after PayPal verifies its matching email", async () => {
    const { app, db, runId } = await prepared();
    const start = await app.inject({ url: `/self-release/start?program_id=budgetapp&run_id=${runId}&sender_item_id=solo_item` });
    expect(start.statusCode).toBe(302);
    const state = new URL(start.headers.location!).searchParams.get("state")!;
    const callback = await app.inject({ url: `/self-release/callback?code=good&state=${encodeURIComponent(state)}` });
    expect(callback.statusCode).toBe(200);
    expect(callback.body).toContain("hold has been released");
    const item = await asBudgetApp<{ state: string }>(db, "SELECT state FROM items WHERE sender_item_id = 'solo_item'");
    expect(item[0]?.state).toBe("sent");
    const audit = await asBudgetApp<{ action: string }>(db, "SELECT action FROM audit_log ORDER BY at DESC LIMIT 2");
    expect(audit.map((row) => row.action)).toContain("self_released");
  });

  it("refuses a mismatched PayPal email", async () => {
    const mismatched: IdentityProvider = { ...fakeIdentity, exchangeCode: async () => ({ email: "other@example.test" }) };
    const { app } = await prepared(mismatched);
    const state = signState({ program_id: "budgetapp", run_id: "self_release_run", sender_item_id: "solo_item", exp: Date.now() + 60_000 }, key);
    const response = await app.inject({ url: `/self-release/callback?code=good&state=${encodeURIComponent(state)}` });
    expect(response.statusCode).toBe(403);
    expect(response.body).toContain("does not match");
    await app.close();
  });

  it("refuses a member of a shared pair hold", async () => {
    const { app, db } = await prepared();
    await withProgram(db, "budgetapp", async (q) => {
      await q.query("UPDATE items SET hold_group_id = 'P-09' WHERE sender_item_id = 'solo_item'");
      await q.query(`INSERT INTO items (program_id, run_id, sender_item_id, receiver, amount_value, currency, context, decision, ring_id, hold_group_id, reasons, rules, state)
        SELECT program_id, run_id, 'pair_sibling', 'sibling@example.test', amount_value, currency, context, decision, NULL, 'P-09', reasons, rules, 'held'
        FROM items WHERE sender_item_id = 'solo_item'`);
    });
    const state = signState({ program_id: "budgetapp", run_id: "self_release_run", sender_item_id: "solo_item", exp: Date.now() + 60_000 }, key);
    const response = await app.inject({ url: `/self-release/callback?code=good&state=${encodeURIComponent(state)}` });
    expect(response.statusCode).toBe(409);
    expect(response.body).toContain("ring or shared hold");
    await app.close();
  });

  it("refuses a ring member even when PayPal returns the matching address", async () => {
    const { app, db } = await prepared();
    await asBudgetApp(db, "UPDATE items SET ring_id = 'R-12' WHERE sender_item_id = 'solo_item'");
    const state = signState({ program_id: "budgetapp", run_id: "self_release_run", sender_item_id: "solo_item", exp: Date.now() + 60_000 }, key);
    const response = await app.inject({ url: `/self-release/callback?code=good&state=${encodeURIComponent(state)}` });
    expect(response.statusCode).toBe(409);
    expect(response.body).toContain("ring or shared hold");
    await app.close();
  });

  it("rejects expired and tampered state", async () => {
    const { app } = await prepared();
    const expired = signState({ program_id: "budgetapp", run_id: "self_release_run", sender_item_id: "solo_item", exp: Date.now() - 1 }, key);
    const tampered = `${expired.slice(0, -1)}x`;
    for (const state of [expired, tampered]) {
      const response = await app.inject({ url: `/self-release/callback?code=good&state=${encodeURIComponent(state)}` });
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain("expired or is invalid");
    }
  });
});
