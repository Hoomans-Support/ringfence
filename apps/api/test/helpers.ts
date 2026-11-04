import { readFileSync } from "node:fs";
import { afterEach } from "vitest";
import { MockPayPal, type PayPalClient } from "@ringfence/paypal";
import { connect, ensureProgram, migrate, withProgram, type Db } from "../src/db";
import { chaos } from "../src/executor";
import { buildApp } from "../src/server";

export const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), "utf8"));
export const week1 = fixture("week1");
export const auth = { authorization: "Bearer budget-key" };

export async function setup(paypal: PayPalClient = new MockPayPal()) {
  const db = await connect("pglite://memory");
  await migrate(db);
  await ensureProgram(db, "budgetapp", "Budgeting app", "budget-key", "budget-mcp-key");
  await ensureProgram(db, "surveyapp", "Survey app", "survey-key");
  // PGlite connects as a superuser, which skips row-level security. Run everything after setup as an
  // ordinary role instead, so every test meets tenant isolation the way the app does on Render.
  await db.exec(`CREATE ROLE ringfence_app; GRANT ALL ON ALL TABLES IN SCHEMA public TO ringfence_app;
                 GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ringfence_app; SET ROLE ringfence_app;`);
  return { db, paypal, app: buildApp({ db, paypal, adminToken: "admin-token" }) };
}

/** A query run as the budgeting app, the way the API's own queries are scoped. */
export const asBudgetApp = <T = Record<string, unknown>>(db: Db, sql: string, params: unknown[] = []) =>
  withProgram(db, "budgetapp", (q) => q.query<T>(sql, params));

const realHook = chaos.hook;
afterEach(() => {
  chaos.hook = realHook;
});

/** Makes the next pass through `point` behave like the process dying there: throw, touch nothing. */
export function crashOnceAt(point: string): void {
  const original = chaos.hook;
  chaos.hook = (p) => {
    if (p !== point) return;
    chaos.hook = original;
    throw Object.assign(new Error(`simulated crash at ${point}`), { name: "ChaosCrash" });
  };
}

/** What a dead process's lease does after it times out. */
export const expireLeases = (db: Db) => db.query("UPDATE outbox SET locked_until = now() WHERE status = 'pending'");
