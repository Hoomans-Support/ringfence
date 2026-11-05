import { describe, expect, it } from "vitest";
import { asBudgetApp, auth, setup } from "./helpers";

const post = (app: Awaited<ReturnType<typeof setup>>["app"], url: string, payload: unknown) => app.inject({ method: "POST", url, headers: auth, payload: payload as object });
const get = (app: Awaited<ReturnType<typeof setup>>["app"], url: string) => app.inject({ method: "GET", url, headers: auth });

describe("event feed (FR-21)", () => {
  it("scores a ring from sign-up events alone, before any payout run exists for them", async () => {
    const { app } = await setup();

    for (const id of ["evt_1", "evt_2", "evt_3"]) {
      const res = await post(app, "/v1/events", {
        account_id: id,
        receiver: `${id}@mailinator.com`, // a disposable domain: the only risk flag available pre-payday
        device_hash: "d_shared_laptop",
        ip_prefix: "10.5.5.0/24",
        signup_at: "2026-11-05T10:00:00Z",
        referrer_id: "u_referrer",
      });
      expect(res.statusCode).toBe(202);
    }
    // An unrelated, unconnected sign-up stays unheld.
    await post(app, "/v1/events", { account_id: "evt_lone", receiver: "lone@example.test", device_hash: "d_lone" });

    const atRisk = (await get(app, "/v1/events/at-risk")).json();
    expect(atRisk.checked).toBe(4);
    expect(atRisk.rings).toHaveLength(1);
    expect(atRisk.rings[0]).toMatchObject({ size: 3 });
    expect(new Set(atRisk.held.map((h: { account_id: string }) => h.account_id))).toEqual(new Set(["evt_1", "evt_2", "evt_3"]));
    expect(atRisk.held.every((h: { reasons: string[] }) => h.reasons.includes("disposable_email"))).toBe(true);
  });

  it("a later event for the same account merges in rather than replacing what's already known", async () => {
    const { app } = await setup();
    await post(app, "/v1/events", { account_id: "evt_merge", device_hash: "d_1" });
    await post(app, "/v1/events", { account_id: "evt_merge", receiver: "merge@mailinator.com", ip_prefix: "10.1.1.0/24" });

    const atRisk = (await get(app, "/v1/events/at-risk")).json();
    expect(atRisk.checked).toBe(1);
    // Only one risk flag (disposable email) and no ring partner: not big enough on its own to hold.
    expect(atRisk.held).toHaveLength(0);
  });

  it("an account that reaches a real payout run is no longer pending", async () => {
    const { app } = await setup();
    await post(app, "/v1/events", { account_id: "u_88213", device_hash: "d_1" });
    expect((await get(app, "/v1/events/at-risk")).json().checked).toBe(1);

    await post(app, "/v1/payout-runs", {
      sender_batch_header: { sender_batch_id: "run_payday" },
      items: [{ recipient_type: "EMAIL", receiver: "lee@example.test", amount: { value: "20.00", currency: "USD" }, sender_item_id: "ref_88213", context: { account_id: "u_88213", signup_at: "2026-11-01T08:14:03Z", device_hash: "d_1", ip_prefix: "10.4.2.0/24" } }],
    });

    expect((await get(app, "/v1/events/at-risk")).json().checked).toBe(0);
  });

  it("IP prefixes are hashed before storage, the same privacy guarantee a real run gets", async () => {
    const { app, db } = await setup();
    await post(app, "/v1/events", { account_id: "evt_priv", device_hash: "d_1", ip_prefix: "10.9.9.0/24" });
    const [row] = await asBudgetApp<{ context: { ip_prefix: string } }>(db, "SELECT context FROM pending_signups WHERE account_id = 'evt_priv'");
    expect(row!.context.ip_prefix).not.toBe("10.9.9.0/24");
    expect(row!.context.ip_prefix).toMatch(/^ip_[0-9a-f]{16}$/);
  });
});
