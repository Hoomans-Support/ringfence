/**
 * The real PayPal client: plain fetch, an OAuth token cache, and a request throttle.
 *
 * - Sandbox only. A base URL that isn't the sandbox (or a local mock server) is refused at
 *   construction, same rule as the original service/server.mjs.
 * - Token cache: one client-credentials token reused until a minute before it expires, with
 *   concurrent callers sharing the in-flight request instead of each fetching their own.
 * - Throttle: the sandbox blocks an IP for 5 minutes after 50 requests a minute, so every call
 *   (token included) is spaced `minIntervalMs` apart. ponytail: per-process spacing; the API and
 *   worker each get their own budget, so keep their sum under 50/min (default 1.5s ≈ 40/min each
 *   is safe because the API only sends while handling a run).
 * - Duplicate batches: PayPal rejects a sender_batch_id used in the last 30 days with a HATEOAS
 *   link to the original batch (Payouts v1 spec). That's recovered here, so a retried create
 *   returns the original batch id instead of an error the caller has to special-case.
 */
import {
  PayPalError,
  type CreateBatchResult,
  type PayoutBatch,
  type PayoutBatchRequest,
  type PayoutItemDetails,
  type PayPalClient,
  type WebhookHeaders,
} from "./types";

export interface RealClientOptions {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  webhookId?: string;
  minIntervalMs?: number;
  fetch?: typeof fetch;
}

const PAGE_SIZE = 1000; // the Payouts API's own maximum page size

const DUPLICATE_BATCH = /sender_batch_id\b.*already exists/i;

/**
 * A reused sender_batch_id comes back as a 400 "Batch with given sender_batch_id already exists".
 * That's not a failure: PayPal already has the batch, so a retry after a crash must treat it as
 * sent. The spec says the error links to the original batch; the sandbox (smoke run, 4 Nov 2026)
 * sends no link and doesn't replay a PayPal-Request-Id either, so the id is then null and the
 * executor learns it from the batch's first webhook (sync.ts) instead.
 */
export async function recoverDuplicate(err: unknown, getBatch: (id: string) => Promise<PayoutBatch>): Promise<CreateBatchResult> {
  if (!(err instanceof PayPalError) || err.status >= 500) throw err;
  const original = err.links.map((l) => /\/v1\/payments\/payouts\/([^/?]+)$/.exec(l.href)?.[1]).find(Boolean);
  if (!original && !DUPLICATE_BATCH.test(err.detail)) throw err;
  const duplicate = { name: err.errorName, message: err.detail };
  if (!original) return { payout_batch_id: null, batch_status: null, duplicate };
  const batch = await getBatch(original);
  return { payout_batch_id: original, batch_status: batch.batch_header.batch_status, duplicate };
}

export function assertSandbox(baseUrl: string): void {
  const host = new URL(baseUrl).hostname;
  if (!host.includes("sandbox") && host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`SANDBOX_ONLY: refusing to run against ${host}`);
  }
}

function header(headers: WebhookHeaders, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export function createRealClient(opts: RealClientOptions): PayPalClient {
  assertSandbox(opts.baseUrl);
  const doFetch = opts.fetch ?? fetch;
  const minIntervalMs = opts.minIntervalMs ?? 1500;
  let nextSlot = 0;
  let cached = { token: "", exp: 0 };
  let inflight: Promise<string> | undefined;

  async function throttle(): Promise<void> {
    const now = Date.now();
    const at = Math.max(now, nextSlot);
    nextSlot = at + minIntervalMs;
    if (at > now) await new Promise((r) => setTimeout(r, at - now));
  }

  async function fetchToken(): Promise<string> {
    await throttle();
    const res = await doFetch(`${opts.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
    if (!res.ok || !data.access_token) throw new PayPalError(res.status, data.error ?? "TOKEN_FAILED", "PayPal token request failed");
    cached = { token: data.access_token, exp: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000 };
    return cached.token;
  }

  async function token(): Promise<string> {
    if (cached.token && Date.now() < cached.exp) return cached.token;
    inflight ??= fetchToken().finally(() => {
      inflight = undefined;
    });
    return inflight;
  }

  async function api<T>(path: string, init: { method?: string; body?: unknown; requestId?: string } = {}): Promise<T> {
    const bearer = await token();
    await throttle();
    const res = await doFetch(`${opts.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
        ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
      },
      body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      // PayPal's top-level message is often generic ("User business error."); the reason is in
      // details[].issue, and debug_id is what PayPal support asks for.
      const details = ((data.details as Array<{ issue?: string; field?: string; description?: string }>) ?? [])
        .map((d) => [d.issue, d.field, d.description].filter(Boolean).join(" "))
        .join("; ");
      const message = String(data.message ?? data.error_description ?? res.statusText);
      throw new PayPalError(
        res.status,
        String(data.name ?? data.error ?? "HTTP_ERROR"),
        [message, details && `(${details})`, data.debug_id && `debug_id ${String(data.debug_id)}`].filter(Boolean).join(" "),
        (data.links as PayPalError["links"]) ?? [],
      );
    }
    return data as T;
  }

  const client: PayPalClient = {
    async createBatch(body: PayoutBatchRequest, requestId: string): Promise<CreateBatchResult> {
      try {
        const res = await api<{ batch_header: { payout_batch_id: string; batch_status: CreateBatchResult["batch_status"] } }>(
          "/v1/payments/payouts",
          { method: "POST", body, requestId },
        );
        return { payout_batch_id: res.batch_header.payout_batch_id, batch_status: res.batch_header.batch_status };
      } catch (err) {
        return recoverDuplicate(err, (id) => client.getBatch(id));
      }
    },

    async getBatch(payoutBatchId: string): Promise<PayoutBatch> {
      // Up to 15,000 items a batch, 1,000 a page: walk every page so the poller and reconciler
      // always see the whole batch.
      const first = await api<PayoutBatch & { total_pages?: number }>(
        `/v1/payments/payouts/${encodeURIComponent(payoutBatchId)}?page=1&page_size=${PAGE_SIZE}&total_required=true`,
      );
      const items = [...(first.items ?? [])];
      for (let page = 2; page <= (first.total_pages ?? 1); page++) {
        const next = await api<PayoutBatch>(`/v1/payments/payouts/${encodeURIComponent(payoutBatchId)}?page=${page}&page_size=${PAGE_SIZE}`);
        items.push(...(next.items ?? []));
      }
      return { batch_header: first.batch_header, items };
    },

    getItem(payoutItemId: string): Promise<PayoutItemDetails> {
      return api(`/v1/payments/payouts-item/${encodeURIComponent(payoutItemId)}`);
    },

    cancelItem(payoutItemId: string): Promise<PayoutItemDetails> {
      return api(`/v1/payments/payouts-item/${encodeURIComponent(payoutItemId)}/cancel`, { method: "POST" });
    },

    // PayPal checks the signature for us. The raw body is spliced in unchanged so it is not
    // re-serialised (a re-serialised event can fail verification).
    async verifyWebhook(headers: WebhookHeaders, rawBody: string): Promise<boolean> {
      if (!opts.webhookId) throw new Error("PAYPAL_WEBHOOK_ID is not set");
      const body =
        `{"auth_algo":${JSON.stringify(header(headers, "paypal-auth-algo"))},` +
        `"cert_url":${JSON.stringify(header(headers, "paypal-cert-url"))},` +
        `"transmission_id":${JSON.stringify(header(headers, "paypal-transmission-id"))},` +
        `"transmission_sig":${JSON.stringify(header(headers, "paypal-transmission-sig"))},` +
        `"transmission_time":${JSON.stringify(header(headers, "paypal-transmission-time"))},` +
        `"webhook_id":${JSON.stringify(opts.webhookId)},"webhook_event":${rawBody}}`;
      // A verify call that fails (network, 5xx) throws rather than reading as "not verified": the
      // webhook route then answers 5xx and PayPal redelivers, instead of the event being dropped.
      const res = await api<{ verification_status?: string }>("/v1/notifications/verify-webhook-signature", { method: "POST", body });
      return res.verification_status === "SUCCESS";
    },
  };
  return client;
}
