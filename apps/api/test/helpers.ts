import { readFileSync } from "node:fs";
import { afterEach } from "vitest";
import { MockPayPal, type PayPalClient } from "@ringfence/paypal";
import { connect, ensureProgram, migrate, type Db } from "../src/db";
import { chaos } from "../src/executor";
import { buildApp } from "../src/server";

export const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), "utf8"));
export const week1 = fixture("week1");
export const auth = { authorization: "Bearer budget-key" };

export async function setup(paypal: PayPalClient = new MockPayPal()) {
  const db = await connect("pglite://memory");
  await migrate(db);
  await ensureProgram(db, "budgetapp", "Budgeting app", "budget-key");
  await ensureProgram(db, "surveyapp", "Survey app", "survey-key");
  return { db, paypal, app: buildApp({ db, paypal, adminToken: "admin-token" }) };
}

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
