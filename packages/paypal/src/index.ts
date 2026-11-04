import { MockPayPal } from "./mock";
import { createRealClient } from "./real";
import type { PayPalClient } from "./types";

export { MockPayPal } from "./mock";
export type { MockOptions, WebhookEvent } from "./mock";
export { startMockServer } from "./mock-server";
export type { MockServer } from "./mock-server";
export { assertSandbox, createRealClient } from "./real";
export type { RealClientOptions } from "./real";
export * from "./types";

/** PAYPAL_MODE=sandbox uses the real client; anything else (the default) is the in-memory mock,
 *  so nothing reaches the shared sandbox by accident. */
export function createPayPalClient(env: NodeJS.ProcessEnv = process.env): PayPalClient {
  if (env.PAYPAL_MODE !== "sandbox") return new MockPayPal();
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new Error("PAYPAL_MODE=sandbox needs PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET");
  return createRealClient({
    baseUrl: env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com",
    clientId: env.PAYPAL_CLIENT_ID,
    clientSecret: env.PAYPAL_CLIENT_SECRET,
    webhookId: env.PAYPAL_WEBHOOK_ID,
    minIntervalMs: env.PAYPAL_MIN_INTERVAL_MS ? Number(env.PAYPAL_MIN_INTERVAL_MS) : undefined,
  });
}
