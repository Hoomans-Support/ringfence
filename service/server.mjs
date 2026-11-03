// Hello-world service: health check plus a PayPal webhook receiver that verifies signatures.
// Zero dependencies. Sandbox only. Reads config from the environment (Render) or ../.env (local).
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";

const envFile = new URL("../.env", import.meta.url);
if (existsSync(envFile)) {
  for (const l of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    if (!l.trim() || l.startsWith("#") || !l.includes("=")) continue;
    process.env[l.slice(0, l.indexOf("=")).trim()] ??= l.slice(l.indexOf("=") + 1).trim();
  }
}

const BASE = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
if (!BASE.includes("sandbox")) throw new Error("SANDBOX_ONLY: refusing to run against a live host");
const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, ADMIN_TOKEN } = process.env;
const PORT = Number(process.env.PORT || 3000);

let cached = { token: "", exp: 0 };
async function getToken() {
  if (cached.token && Date.now() < cached.exp) return cached.token;
  const res = await fetch(BASE + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error("PayPal token request failed");
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return cached.token;
}

// PayPal checks the signature for us. The raw body is spliced in unchanged so it is not re-serialised.
async function verifyWebhook(headers, rawBody) {
  if (!PAYPAL_WEBHOOK_ID) throw new Error("PAYPAL_WEBHOOK_ID is not set");
  const body =
    `{"auth_algo":${JSON.stringify(headers["paypal-auth-algo"])},` +
    `"cert_url":${JSON.stringify(headers["paypal-cert-url"])},` +
    `"transmission_id":${JSON.stringify(headers["paypal-transmission-id"])},` +
    `"transmission_sig":${JSON.stringify(headers["paypal-transmission-sig"])},` +
    `"transmission_time":${JSON.stringify(headers["paypal-transmission-time"])},` +
    `"webhook_id":${JSON.stringify(PAYPAL_WEBHOOK_ID)},"webhook_event":${rawBody}}`;
  const res = await fetch(BASE + "/v1/notifications/verify-webhook-signature", {
    method: "POST",
    headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && data.verification_status === "SUCCESS";
}

const events = []; // last 20 verified events, in memory only
const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) { reject(new Error("body too large")); req.destroy(); }
      else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
const send = (res, status, obj) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
};

createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://x");
    if (req.method === "GET" && pathname === "/health") {
      return send(res, 200, { ok: true, sandbox: true, webhookConfigured: Boolean(PAYPAL_WEBHOOK_ID) });
    }
    if (req.method === "POST" && pathname === "/webhooks/paypal") {
      const raw = await readBody(req);
      if (!(await verifyWebhook(req.headers, raw))) return send(res, 400, { ok: false, error: "signature not verified" });
      const e = JSON.parse(raw);
      events.unshift({ id: e.id, type: e.event_type, at: e.create_time });
      events.length = Math.min(events.length, 20);
      console.log(`webhook verified: ${e.event_type} ${e.id}`);
      return send(res, 200, { ok: true });
    }
    if (req.method === "GET" && pathname === "/events") {
      if (!ADMIN_TOKEN || req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return send(res, 404, { error: "not found" });
      return send(res, 200, events);
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    console.error("request failed:", e.message);
    send(res, 500, { ok: false });
  }
}).listen(PORT, () => console.log(`listening on ${PORT} (sandbox)`));
