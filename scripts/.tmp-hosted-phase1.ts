// Throwaway: phase 1 of the hosted check. Nothing here gives out a ring, pair or rule number.
import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

process.loadEnvFile(".env");
const B = process.env.RINGFENCE_API_URL!;
const key = { authorization: `Bearer ${process.env.RINGFENCE_API_KEY}`, "content-type": "application/json" };
const admin = { authorization: `Bearer ${process.env.ADMIN_TOKEN}` };
const fixture = (n: string) => JSON.parse(readFileSync(`fixtures/${n}.json`, "utf8"));
const week1 = fixture("week1");
const week2 = fixture("week2");
const stamp = Date.now();
let failures = 0;
const check = (name: string, ok: boolean, detail: unknown) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
};
const req = async (method: string, path: string, body?: unknown, headers: Record<string, string> = key) => {
  const res = await fetch(`${B}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
};
type D = { sender_item_id: string; decision: string; state?: string; ring_id?: string; hold_group_id?: string; reasons: string[]; rules: string[] };
const groups = (ds: D[]) => ({
  rings: [...new Set(ds.map((d) => d.ring_id).filter(Boolean))],
  pairs: [...new Set(ds.filter((d) => !d.ring_id && d.hold_group_id?.startsWith("P-")).map((d) => d.hold_group_id))],
});

// A. Access
check("no key -> 401 on payout runs", (await req("POST", "/v1/payout-runs", {}, { "content-type": "application/json" })).status === 401, "");
check("no key -> 401 on MCP", (await req("POST", "/mcp", {}, { "content-type": "application/json" })).status === 401, "");
check("unsigned webhook -> 400 unverified", (await req("POST", "/v1/webhooks/paypal", { id: "WH-PROBE" }, { "content-type": "application/json" })).status === 400, "");
check("admin events without the token -> 404", (await req("GET", "/v1/webhooks/events", undefined, {})).status === 404, "");

// B. Screening week 1: the demo's numbers are in place, and screening doesn't use them up
const s1 = await req("POST", "/v1/screen", week1);
check("screen week 1: 387 pay / 25 hold", s1.json.summary?.pay === 387 && s1.json.summary?.hold === 25 && s1.json.summary?.block === 0, s1.json.summary);
check("screen week 1: the ring is R-12, the pair P-01 (demo numbering from render.yaml)", JSON.stringify(groups(s1.json.decisions)) === JSON.stringify({ rings: ["R-12"], pairs: ["P-01"] }), groups(s1.json.decisions));
const s1b = await req("POST", "/v1/screen", week1);
check("screening again gives the same numbers (nothing used up)", JSON.stringify(groups(s1b.json.decisions)) === JSON.stringify(groups(s1.json.decisions)), groups(s1b.json.decisions));
check("every screened decision names its rules", s1.json.decisions.every((d: D) => d.rules.length > 0), "");
const s2 = await req("POST", "/v1/screen", week2);
check("screen week 2 before any rule is learned: nothing held (the graph can't link the disguise)", s2.json.summary?.hold === 0, s2.json.summary);

// C. MCP, with the program's key
const client = new Client({ name: "hosted-check", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(`${B}/mcp`), { requestInit: { headers: { authorization: key.authorization } } }));
const tools = (await client.listTools()).tools;
check("MCP offers exactly screen_payees and explain_ring, both read-only", tools.map((t) => t.name).sort().join() === "explain_ring,screen_payees" && tools.every((t) => t.annotations?.readOnlyHint === true), tools.map((t) => t.name));
const screened = JSON.parse(((await client.callTool({ name: "screen_payees", arguments: { payees: week1.items } })) as { content: Array<{ text: string }> }).content[0]!.text);
const comparable = (ds: D[]) => ds.map((d) => `${d.sender_item_id}|${d.decision}|${d.ring_id ?? ""}|${d.hold_group_id ?? ""}|${d.rules.join(",")}`).sort().join("\n");
check("MCP screen_payees gives the API's decisions, payee for payee", comparable(screened.decisions) === comparable(s1.json.decisions), screened.summary);
const missing = (await client.callTool({ name: "explain_ring", arguments: { ring_id: "R-12", run_id: "no_such_run" } })) as { isError?: boolean };
check("MCP explain_ring on a ring that doesn't exist is an error, not a crash", missing.isError === true, "");
await client.close();

// D. Validation at the boundary
check("malformed run -> 400", (await req("POST", "/v1/payout-runs", { sender_batch_header: {}, items: [] })).status === 400, "");
const dupItems = { sender_batch_header: { sender_batch_id: `hosted_dup_${stamp}` }, items: [0, 1].map(() => ({ recipient_type: "EMAIL", receiver: "a@example.test", amount: { value: "1.00", currency: "USD" }, sender_item_id: "same" })) };
check("repeated sender_item_id -> 400", (await req("POST", "/v1/payout-runs", dupItems)).status === 400, "");
check("rule proposal with neither learned_from nor revises -> 400", (await req("POST", "/v1/rules", { rule: { action: "HOLD", when: { all: [{ signal: "onboarding_seconds", max: 120 }] } } })).status === 400, "");
check("revising a rule that doesn't exist -> 404", (await req("POST", "/v1/rules", { rule: { action: "HOLD", when: { all: [{ signal: "onboarding_seconds", max: 120 }] } }, revises: "R-99" })).status === 404, "");
check("confirming a hold group that doesn't exist -> 404", (await req("POST", "/v1/rings/R-99/confirm", { run_id: "no_such_run" })).status === 404, "");

// E. A real run through the hosted app: one payee who claims, one who never registered
const runId = `hosted_e2e_${stamp}`;
const run = {
  sender_batch_header: { sender_batch_id: runId, email_subject: "Ringfence hosted check" },
  items: [
    { recipient_type: "EMAIL", receiver: process.env.SMOKE_RECEIVER, amount: { value: "1.00", currency: "USD" }, sender_item_id: `${runId}_claims` },
    { recipient_type: "EMAIL", receiver: `ringfence-never-registered-${stamp}@example.com`, amount: { value: "1.00", currency: "USD" }, sender_item_id: `${runId}_never` },
  ],
};
const t0 = Date.now();
const posted = await req("POST", "/v1/payout-runs", run);
check("run with 2 payouts -> 201 with a real PayPal batch id", posted.status === 201 && /^[A-Z0-9]{10,}$/.test(posted.json.paypal?.payout_batch_id ?? ""), { status: posted.status, paypal: posted.json.paypal, ms: Date.now() - t0 });
check("its summary: 2 paid (sent on time), 0 held", posted.json.summary?.paid === 2 && posted.json.summary?.held === 0, posted.json.summary);
const resent = await req("POST", "/v1/payout-runs", run);
check("resending the same run -> 200, same batch, nothing sent again", resent.status === 200 && resent.json.paypal?.payout_batch_id === posted.json.paypal?.payout_batch_id, resent.json.paypal);

let states: Record<string, string> = {};
let events: Array<{ event_type: string; payout_batch_id: string; applied: boolean }> = [];
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 15_000));
  const now = await req("GET", `/v1/payout-runs/${runId}`);
  states = Object.fromEntries(now.json.decisions.map((d: D) => [d.sender_item_id.replace(`${runId}_`, ""), d.state]));
  events = ((await req("GET", "/v1/webhooks/events", undefined, admin)).json as typeof events).filter((e) => e.payout_batch_id === posted.json.paypal?.payout_batch_id);
  if (states.claims !== "sent" && states.never !== "sent" && events.length >= 2) break;
}
check("the claiming payee's outcome: succeeded", states.claims === "succeeded", states);
check("the never-registered payee's outcome: unclaimed", states.never === "unclaimed", states);
check("PayPal's signed webhooks for this batch arrived and were verified", events.length >= 2, events.map((e) => `${e.event_type}${e.applied ? " (applied)" : ""}`));

// F. Nothing above used up a number
const s1c = await req("POST", "/v1/screen", week1);
check("after all of that, week 1 still screens as R-12 / P-01", JSON.stringify(groups(s1c.json.decisions)) === JSON.stringify({ rings: ["R-12"], pairs: ["P-01"] }), groups(s1c.json.decisions));

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
