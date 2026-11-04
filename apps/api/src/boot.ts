/** What the API, worker and cron all do first: read ../../.env if there is one, connect, migrate. */
import { existsSync } from "node:fs";
import { createPayPalClient, type PayPalClient } from "@ringfence/paypal";
import { connect, migrate, type Db } from "./db";

export async function boot(): Promise<{ db: Db; paypal: PayPalClient }> {
  const envFile = new URL("../../../.env", import.meta.url);
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const db = await connect();
  await migrate(db);
  return { db, paypal: createPayPalClient() };
}
