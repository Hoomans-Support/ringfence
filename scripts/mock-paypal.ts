/**
 * A local stand-in for the PayPal sandbox: the mock server (packages/paypal) on its own port,
 * delivering signed webhooks to a local API. Point the API, worker and cron at it to run the whole
 * real-client path offline, with nothing reaching the shared sandbox:
 *
 *   npm run mock-paypal
 *   PAYPAL_MODE=sandbox PAYPAL_BASE_URL=http://127.0.0.1:4010 PAYPAL_CLIENT_ID=x PAYPAL_CLIENT_SECRET=x PAYPAL_WEBHOOK_ID=x npm start -w @ringfence/api
 *
 * MOCK_PAYPAL_PORT (4010), MOCK_WEBHOOK_URL (http://127.0.0.1:3000/v1/webhooks/paypal), and
 * MOCK_UNCLAIMED, a regex of receivers who never claim (their payouts settle UNCLAIMED).
 */
import { MockPayPal, startMockServer } from "@ringfence/paypal";

const unclaimed = process.env.MOCK_UNCLAIMED ? new RegExp(process.env.MOCK_UNCLAIMED) : undefined;
const server = await startMockServer(new MockPayPal({ isUnclaimed: (r) => unclaimed?.test(r) ?? false }), {
  port: Number(process.env.MOCK_PAYPAL_PORT ?? 4010),
  webhookUrl: process.env.MOCK_WEBHOOK_URL ?? "http://127.0.0.1:3000/v1/webhooks/paypal",
});
console.log(`mock PayPal at ${server.url}, webhooks to ${process.env.MOCK_WEBHOOK_URL ?? "http://127.0.0.1:3000/v1/webhooks/paypal"}`);
