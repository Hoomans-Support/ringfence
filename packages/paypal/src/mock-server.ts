/**
 * MockPayPal over HTTP, on PayPal's own paths. Point the *real* client's base URL at it and the
 * whole real code path (token, PayPal-Request-Id, paging, error mapping, signature verification)
 * runs without the sandbox. The chaos CLI uses this: the mock outlives every executor process it
 * kills, so its ledger is the ground truth for "paid exactly once". With `webhookUrl`, it also
 * delivers each signed event there, the way PayPal would.
 */
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { MockPayPal } from "./mock";
import { PayPalError } from "./types";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export interface MockServer {
  url: string;
  mock: MockPayPal;
  /** Total requests served, for the smoke test's rate check. */
  requestCount(): number;
  close(): Promise<void>;
}

export async function startMockServer(
  mock: MockPayPal = new MockPayPal(),
  opts: { port?: number; webhookUrl?: string } = {},
): Promise<MockServer> {
  let requests = 0;
  let tokens = 0;

  if (opts.webhookUrl) {
    const target = opts.webhookUrl;
    mock.listeners.push((event) => {
      const { headers, body } = mock.signedWebhook(event);
      // Delivered after the current request finishes, like PayPal's own asynchronous webhooks.
      setTimeout(() => void fetch(target, { method: "POST", headers, body }).catch(() => undefined), 10);
    });
  }

  const server = createServer(async (req, res) => {
    requests += 1;
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    try {
      const { pathname } = new URL(req.url ?? "/", "http://mock");
      const raw = await readBody(req);
      const method = req.method ?? "GET";
      let m: RegExpExecArray | null;

      if (method === "POST" && pathname === "/v1/oauth2/token") {
        if (!req.headers.authorization?.startsWith("Basic ")) return send(401, { error: "invalid_client" });
        tokens += 1;
        return send(200, { access_token: `mock-token-${tokens}`, token_type: "Bearer", expires_in: 32_400 });
      }
      if (!req.headers.authorization?.startsWith("Bearer ")) return send(401, { name: "AUTHENTICATION_FAILURE", message: "no token" });

      if (method === "POST" && pathname === "/v1/payments/payouts") {
        const requestId = String(req.headers["paypal-request-id"] ?? `anon-${requests}`);
        const created = await mock.acceptBatch(JSON.parse(raw), requestId);
        return send(201, { batch_header: { payout_batch_id: created.payout_batch_id, batch_status: created.batch_status } });
      }
      if (method === "GET" && (m = /^\/v1\/payments\/payouts\/([^/]+)$/.exec(pathname))) {
        return send(200, { ...(await mock.getBatch(decodeURIComponent(m[1] ?? ""))), total_pages: 1 });
      }
      if (method === "GET" && (m = /^\/v1\/payments\/payouts-item\/([^/]+)$/.exec(pathname))) {
        return send(200, await mock.getItem(decodeURIComponent(m[1] ?? "")));
      }
      if (method === "POST" && (m = /^\/v1\/payments\/payouts-item\/([^/]+)\/cancel$/.exec(pathname))) {
        return send(200, await mock.cancelItem(decodeURIComponent(m[1] ?? "")));
      }
      if (method === "POST" && pathname === "/v1/notifications/verify-webhook-signature") {
        const body = JSON.parse(raw) as { transmission_sig?: string; webhook_event?: unknown };
        const ok = await mock.verifyWebhook({ "paypal-transmission-sig": body.transmission_sig }, JSON.stringify(body.webhook_event));
        return send(200, { verification_status: ok ? "SUCCESS" : "FAILURE" });
      }
      send(404, { name: "RESOURCE_NOT_FOUND", message: `${method} ${pathname}` });
    } catch (err) {
      if (err instanceof PayPalError) return send(err.status, { name: err.errorName, message: err.detail, links: err.links });
      send(500, { name: "INTERNAL_SERVER_ERROR", message: String(err) });
    }
  });

  await new Promise<void>((resolve) => server.listen(opts.port ?? 0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    mock,
    requestCount: () => requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
