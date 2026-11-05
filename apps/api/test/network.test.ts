import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MockPayPal } from "@ringfence/paypal";
import { withProgram } from "../src/db";
import { auth, setup, week1 } from "./helpers";

const surveyAuth = { authorization: "Bearer survey-key" };
const post = (app: Awaited<ReturnType<typeof setup>>["app"], url: string, payload: unknown, headers = auth) =>
  app.inject({ method: "POST", url, headers, payload: payload as object });

describe("ring network (FR-19)", () => {
  const originalKey = process.env.RINGFENCE_NETWORK_KEY;
  beforeEach(() => {
    process.env.RINGFENCE_NETWORK_KEY = "test-network-key";
  });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.RINGFENCE_NETWORK_KEY;
    else process.env.RINGFENCE_NETWORK_KEY = originalKey;
  });

  async function budgetappConfirmedRing() {
    const mock = new MockPayPal();
    const { app, db } = await setup(mock);
    await post(app, "/v1/payout-runs", week1);
    const confirmed = (await post(app, "/v1/rings/R-01/confirm", { run_id: "run_2026w45" })).json();
    const ringItem = week1.items.find((i: { sender_item_id: string; context: { device_hash: string } }) => i.context.device_hash === "d_ring_falcon");
    return { app, db, confirmed, ringItem };
  }

  it("holds (never blocks) a payee at another program who reuses a confirmed ring's exact payout address", async () => {
    const { app, confirmed, ringItem } = await budgetappConfirmedRing();
    expect(confirmed.payout_addresses).toBeGreaterThan(0);

    const atSurveyApp = {
      sender_batch_header: { sender_batch_id: "survey_run_1" },
      items: [{ recipient_type: "EMAIL", receiver: ringItem.receiver, amount: { value: "10.00", currency: "USD" }, sender_item_id: "survey_ref_1", context: { account_id: "survey_u_1", signup_at: "2026-11-05T00:00:00Z", device_hash: "survey_device_unrelated", ip_prefix: "10.9.9.0/24" } }],
    };
    const screened = (await post(app, "/v1/screen", atSurveyApp, surveyAuth)).json();
    expect(screened.decisions[0]).toMatchObject({ sender_item_id: "survey_ref_1", decision: "HOLD", rules: ["S-03"] });
    expect(screened.decisions[0].reasons).toContain("network_match");
  });

  it("holds a payee at another program who reuses a confirmed ring's device", async () => {
    const { app, ringItem } = await budgetappConfirmedRing();

    const atSurveyApp = {
      sender_batch_header: { sender_batch_id: "survey_run_2" },
      items: [{ recipient_type: "EMAIL", receiver: "brand.new@example.test", amount: { value: "10.00", currency: "USD" }, sender_item_id: "survey_ref_2", context: { account_id: "survey_u_2", signup_at: "2026-11-05T00:00:00Z", device_hash: ringItem.context.device_hash, ip_prefix: "10.9.9.0/24" } }],
    };
    const screened = (await post(app, "/v1/screen", atSurveyApp, surveyAuth)).json();
    expect(screened.decisions[0]).toMatchObject({ decision: "HOLD", rules: ["S-03"] });
  });

  it("never reveals the other program's data: the receiving program's own confirmed-fraud list stays empty", async () => {
    const { app, db, ringItem } = await budgetappConfirmedRing();
    await post(app, "/v1/screen", {
      sender_batch_header: { sender_batch_id: "survey_run_3" },
      items: [{ recipient_type: "EMAIL", receiver: ringItem.receiver, amount: { value: "10.00", currency: "USD" }, sender_item_id: "survey_ref_3", context: { account_id: "survey_u_3", signup_at: "2026-11-05T00:00:00Z", device_hash: "survey_device_unrelated", ip_prefix: "10.9.9.0/24" } }],
    }, surveyAuth);
    const fraud = await withProgram(db, "surveyapp", (q) => q.query("SELECT 1 FROM known_fraud WHERE program_id = 'surveyapp'"));
    expect(fraud).toHaveLength(0);
  });

  it("a payee with no connection to any confirmed ring is paid as usual", async () => {
    const { app } = await budgetappConfirmedRing();
    const screened = (await post(app, "/v1/screen", {
      sender_batch_header: { sender_batch_id: "survey_run_4" },
      items: [{ recipient_type: "EMAIL", receiver: "totally.unrelated@example.test", amount: { value: "10.00", currency: "USD" }, sender_item_id: "survey_ref_4", context: { account_id: "survey_u_4", signup_at: "2026-11-05T00:00:00Z", device_hash: "survey_device_unrelated", ip_prefix: "10.9.9.0/24" } }],
    }, surveyAuth)).json();
    expect(screened.decisions[0]).toMatchObject({ decision: "PAY", rules: ["S-00"] });
  });

  it("without RINGFENCE_NETWORK_KEY set, nothing matches and nothing throws", async () => {
    delete process.env.RINGFENCE_NETWORK_KEY;
    const { app, ringItem } = await budgetappConfirmedRing();
    const screened = (await post(app, "/v1/screen", {
      sender_batch_header: { sender_batch_id: "survey_run_5" },
      items: [{ recipient_type: "EMAIL", receiver: ringItem.receiver, amount: { value: "10.00", currency: "USD" }, sender_item_id: "survey_ref_5", context: { account_id: "survey_u_5", signup_at: "2026-11-05T00:00:00Z", device_hash: "survey_device_unrelated", ip_prefix: "10.9.9.0/24" } }],
    }, surveyAuth)).json();
    expect(screened.decisions[0]).toMatchObject({ decision: "PAY", rules: ["S-00"] });
  });
});
