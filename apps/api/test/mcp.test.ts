// Task 11's "done when": an agent screening over MCP gets the same decisions as the API, and no
// tool (or the MCP key) can move money, release a hold or change a rule.
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { MockPayPal } from "@ringfence/paypal";
import { auth, fixture, setup, week1 } from "./helpers";

const mcpKey = { authorization: "Bearer budget-mcp-key" };
const closers: Array<() => Promise<unknown>> = [];
afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

async function agentConnected() {
  const mock = new MockPayPal();
  const ctx = await setup(mock);
  await ctx.app.listen({ port: 0, host: "127.0.0.1" });
  closers.push(() => ctx.app.close());
  const { port } = ctx.app.server.address() as AddressInfo;
  const client = new Client({ name: "ops-agent", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), { requestInit: { headers: mcpKey } }));
  closers.unshift(() => client.close());
  const call = async (name: string, args: Record<string, unknown>) => {
    const result = (await client.callTool({ name, arguments: args })) as { content: Array<{ text: string }>; isError?: boolean };
    return { isError: result.isError ?? false, body: JSON.parse(result.content[0]!.text) };
  };
  return { ...ctx, mock, client, call };
}

const comparable = (d: { sender_item_id: string; decision: string; ring_id?: string; hold_group_id?: string; reasons: string[]; rules: string[] }) => ({
  sender_item_id: d.sender_item_id,
  decision: d.decision,
  ring_id: d.ring_id,
  hold_group_id: d.hold_group_id,
  reasons: [...d.reasons].sort(),
  rules: d.rules,
});
const byId = (a: { sender_item_id: string }, b: { sender_item_id: string }) => a.sender_item_id.localeCompare(b.sender_item_id);

describe("MCP server", () => {
  it("offers exactly two tools, both read-only", async () => {
    const { client } = await agentConnected();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["explain_ring", "screen_payees"]);
    expect(tools.every((t) => t.annotations?.readOnlyHint === true && t.annotations?.destructiveHint === false)).toBe(true);
  });

  it("screen_payees gets the same decisions as the API, and stores and pays nothing", async () => {
    const { app, mock, call } = await agentConnected();
    const screened = await call("screen_payees", { payees: week1.items });
    expect(screened.body.summary).toEqual({ pay: 387, hold: 25, block: 0 });
    expect((await app.inject({ url: "/v1/payout-runs/run_2026w45", headers: auth })).statusCode).toBe(404);
    expect(mock.ledger()).toHaveLength(0);

    const run = (await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 })).json();
    expect(screened.body.decisions.map(comparable).sort(byId)).toEqual(run.decisions.map(comparable).sort(byId));
  });

  it("stays in step with the API after the program learns: week 2 is held by the learned rule both ways", async () => {
    const { app, call } = await agentConnected();
    const post = (url: string, payload: unknown) => app.inject({ method: "POST", url, headers: auth, payload: payload as object });
    await post("/v1/payout-runs", week1);
    await post("/v1/rings/R-01/confirm", { run_id: "run_2026w45" });
    const rule = { id: "R-07", action: "HOLD", when: { all: [
      { signal: "signup_burst", same: "referrer", window_min: 30, min_accounts: 5 },
      { signal: "onboarding_seconds", max: 120 },
      { signal: "activity_after_onboarding", max: 0 },
    ] } };
    const { rule_id } = (await post("/v1/rules", { rule, learned_from: { ring_id: "R-01", run_id: "run_2026w45" } })).json();
    await post(`/v1/rules/${rule_id}/approve`, { approved_by: "rina@budgetapp.test", acknowledge_flags: true });

    const week2 = fixture("week2");
    const screened = await call("screen_payees", { payees: week2.items });
    const run = (await post("/v1/payout-runs", week2)).json();
    expect(screened.body.rule_set_version).toBe(`starter-1+${rule_id}v1`);
    expect(screened.body.summary).toEqual({ pay: 419, hold: 18, block: 0 });
    expect(screened.body.decisions.map(comparable).sort(byId)).toEqual(run.decisions.map(comparable).sort(byId));
  });

  it("explain_ring returns the ring's checked case file with payee emails masked", async () => {
    const { app, call } = await agentConnected();
    await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 });
    const { isError, body } = await call("explain_ring", { ring_id: "R-01", run_id: "run_2026w45" });
    expect(isError).toBe(false);
    expect(body).toMatchObject({ ring_id: "R-01", size: 23, rules: ["S-01"] });
    const [checked, total] = body.case_file.claims_checked.split(" of ").map(Number);
    expect(checked).toBe(total);
    expect(body.case_file.claims.length).toBe(checked);
    expect(JSON.stringify(body)).not.toMatch(/@/); // no payee email reaches the agent
    expect(body.members[0].payee).toMatch(/^payee_[0-9a-f]{10}$/);

    expect((await call("explain_ring", { ring_id: "R-99", run_id: "run_2026w45" })).isError).toBe(true);
  });

  it("the MCP key is read-only on the API too: it can screen and explain, never send or release", async () => {
    const { app } = await agentConnected();
    const post = (url: string, payload: unknown) => app.inject({ method: "POST", url, headers: mcpKey, payload: payload as object });
    expect((await post("/v1/payout-runs", week1)).statusCode).toBe(403);
    expect((await post("/v1/holds/release", { run_id: "run_2026w45", hold_group_id: "P-01" })).statusCode).toBe(403);
    expect((await post("/v1/rings/R-01/confirm", { run_id: "run_2026w45" })).statusCode).toBe(403);
    expect((await post("/v1/rules/R-07/approve", { approved_by: "agent" })).statusCode).toBe(403);
    expect((await post("/v1/screen", week1)).statusCode).toBe(200);

    await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 });
    expect((await app.inject({ url: "/v1/rings/R-01?run_id=run_2026w45", headers: mcpKey })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/mcp", payload: {} })).statusCode).toBe(401);
  });
});
