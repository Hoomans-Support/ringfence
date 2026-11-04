import { describe, expect, it } from "vitest";
import { MockPayPal } from "@ringfence/paypal";
import { buildApp } from "../src/server";
import { startWorkerLoop } from "../src/loop";
import { auth, setup, week1 } from "./helpers";

describe("the worker loop", () => {
  it("sends a run the API only recorded, and polls it to paid", async () => {
    const mock = new MockPayPal();
    const { db } = await setup(mock);
    const app = buildApp({ db, paypal: mock, inlineSend: false });
    expect((await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 })).statusCode).toBe(201);

    const stop = startWorkerLoop(db, mock, 10);
    const states = async () => (await app.inject({ url: "/v1/payout-runs/run_2026w45", headers: auth })).json().decisions.map((d: { state: string }) => d.state);
    for (let i = 0; i < 100 && (await states()).filter((s: string) => s === "paid").length < 387; i++) await new Promise((r) => setTimeout(r, 20));
    await stop();

    expect((await states()).filter((s: string) => s === "paid")).toHaveLength(387);
    expect(mock.paidCounts().size).toBe(387);
  });
});
