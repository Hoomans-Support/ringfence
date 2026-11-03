// Day 1 gate: create capture orders, wait for sandbox buyer approval, capture, then refund.
// Usage: node scripts/day1-refund-check.mjs [count]   (default 2: first refunded partly, second fully)
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const BASE = env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
if (!BASE.includes("sandbox")) throw new Error("SANDBOX_ONLY: refusing to run against a live host");
if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new Error("Fill PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env");

// Args: a number creates that many new orders (default 2); order IDs reuse existing, already-created orders.
const arg = process.argv.slice(2);
const existing = arg.filter((a) => !/^\d+$/.test(a));
const count = existing.length ? 0 : Number(arg[0] || 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, { method = "GET", body, token, requestId } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(requestId && { "PayPal-Request-Id": requestId }),
    },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const auth = await fetch(BASE + "/v1/oauth2/token", {
  method: "POST",
  headers: {
    Authorization: "Basic " + Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64"),
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: "grant_type=client_credentials",
});
const authData = await auth.json();
if (!auth.ok) throw new Error(`Token failed: ${JSON.stringify(authData)}`);
const token = authData.access_token;
console.log("Token OK\n");

const run = Date.now();
const orders = [...existing];
for (let i = 0; i < count; i++) {
  const o = await api("/v2/checkout/orders", {
    method: "POST",
    token,
    requestId: `d1-order-${run}-${i}`,
    body: { intent: "CAPTURE", purchase_units: [{ amount: { currency_code: "USD", value: "12.00" } }] },
  });
  orders.push(o.id);
  console.log(`Order ${i + 1}: ${o.id}\n  Approve as the sandbox BUYER: ${o.links.find((l) => l.rel === "approve").href}`);
}

console.log("\nWaiting for you to approve each link in a browser (up to 10 min)...");
const pending = new Set(orders);
for (let t = 0; t < 120 && pending.size; t++) {
  for (const id of [...pending]) {
    const o = await api(`/v2/checkout/orders/${id}`, { token });
    if (o.status === "APPROVED") {
      pending.delete(id);
      console.log(`  approved: ${id}`);
    }
  }
  if (pending.size) await sleep(5000);
}
if (pending.size) console.log(`Not approved in time, skipping (rerun with these IDs later): ${[...pending].join(" ")}`);
const approved = orders.filter((id) => !pending.has(id));
if (!approved.length) throw new Error("No approved orders to capture");

const captures = [];
for (const [i, id] of approved.entries()) {
  try {
    const c = await api(`/v2/checkout/orders/${id}/capture`, { method: "POST", token, requestId: `d1-capture-${run}-${i}`, body: {} });
    const capId = c.purchase_units[0].payments.captures[0].id;
    captures.push(capId);
    console.log(`Captured ${id} -> capture ${capId} (${c.status})`);
  } catch (e) {
    console.log(`Skipped ${id}: ${e.message.includes("ORDER_ALREADY_CAPTURED") ? "already captured" : e.message}`);
  }
}
if (!captures.length) throw new Error("No new captures to refund");

console.log("\nRefund checks:");
const partial = await api(`/v2/payments/captures/${captures[0]}/refund`, {
  method: "POST", token, requestId: `d1-refund-partial-${run}`,
  body: { amount: { currency_code: "USD", value: "5.00" }, note_to_payer: "Day 1 partial refund test" },
});
console.log(`  partial refund OK: ${partial.id} (${partial.status})`);
if (captures[1]) {
  const full = await api(`/v2/payments/captures/${captures[1]}/refund`, {
    method: "POST", token, requestId: `d1-refund-full-${run}`, body: { note_to_payer: "Day 1 full refund test" },
  });
  console.log(`  full refund OK: ${full.id} (${full.status})`);
}
console.log("\nGATE PASSED: refunds work. Keep the other captured payments as seed data.");
