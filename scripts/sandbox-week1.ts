/**
 * The PRD's Wednesday gate as one command: week 1 through the real API code (decide, send, poll,
 * release the roommates, confirm the ring, reconcile) against the real PayPal sandbox.
 *
 *   npm run sandbox:week1     needs PAYPAL_CLIENT_ID/SECRET in .env, and $7,740+ in the sandbox
 *                             business account; DATABASE_URL defaults to an in-memory PGlite
 *
 * The run gets a fresh sender_batch_id each time: PayPal refuses a reused one for 30 days, and
 * the fixture's own run_2026w45 is kept for the hosted demo.
 */
import { readFileSync } from "node:fs";
import { createPayPalClient } from "@ringfence/paypal";
import { connect, ensureProgram, migrate, withProgram } from "../apps/api/src/db";
import { pollBatches, reconcile } from "../apps/api/src/sync";
import { buildApp } from "../apps/api/src/server";

process.loadEnvFile(".env");
const paypal = createPayPalClient({ ...process.env, PAYPAL_MODE: "sandbox" });
const db = await connect(process.env.DATABASE_URL);
await migrate(db);
await ensureProgram(db, "budgetapp", "Budgeting app", "verify-key", undefined, { startRing: 12, startRule: 7 });
const app = buildApp({ db, paypal });
const auth = { authorization: "Bearer verify-key" };
const states = async () =>
  Object.fromEntries(
    (await withProgram(db, "budgetapp", (q) => q.query<{ state: string; n: number }>("SELECT state, count(*)::int AS n FROM items GROUP BY 1 ORDER BY 1"))).map((r) => [r.state, r.n]),
  );

const runId = `verify_w45_${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
const week1 = JSON.parse(readFileSync("fixtures/week1.json", "utf8"));
week1.sender_batch_header.sender_batch_id = runId;

let t = Date.now();
const res = await app.inject({ method: "POST", url: "/v1/payout-runs", headers: auth, payload: week1 });
const run = res.json();
console.log(`1. POST /v1/payout-runs -> ${res.statusCode} in ${((Date.now() - t) / 1000).toFixed(1)}s`, run.summary ?? run, run.paypal);

for (let i = 0; i < 40; i++) {
  await pollBatches(db, paypal);
  const s = await states();
  if (!s.sent) break;
  await new Promise((r) => setTimeout(r, 15_000));
}
console.log("2. after polling:", await states());

const release = await app.inject({ method: "POST", url: "/v1/holds/release", headers: auth, payload: { run_id: runId, hold_group_id: "P-01", released_by: "rina@budgetapp.test" } });
console.log(`3. release P-01 -> ${release.statusCode}`, release.json());

const confirm = await app.inject({ method: "POST", url: "/v1/rings/R-12/confirm", headers: auth, payload: { run_id: runId } });
console.log(`4. confirm R-12 -> ${confirm.statusCode}`, confirm.json());

for (let i = 0; i < 40; i++) {
  await pollBatches(db, paypal);
  if (!(await states()).sent) break;
  await new Promise((r) => setTimeout(r, 15_000));
}
console.log("5. after polling the release:", await states());

const report = await reconcile(db, paypal);
console.log(`6. reconcile: ${report.batches} batches, ${report.applied} applied, ${report.gaps.length} gaps`, report.gaps.slice(0, 5));
await db.close();
