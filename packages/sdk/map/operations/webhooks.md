<!-- Generated file — do not edit; regenerated with the SDK. -->

# Webhooks — operations

Accessor: `client.webhooks` · Source: `src/resources/webhooks.ts` · 2 operations · Request and error types: namespace `Webhooks`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `ringfence-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### listWebhookEvents

- **Signature**: `listWebhookEvents(options?: RequestOptions): ApiPromise<WebhookEventLogEntry[], Webhooks.ListWebhookEventsError>`
- **Wire**: `GET /v1/webhooks/events`
- **Auth**: `adminBearerAuth`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `WebhookEventLogEntry[]` — a bare `application/json` array; the success type *is* the array, not a wrapper model
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Webhooks.ListWebhookEventsError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [404] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `WebhookEventLogEntry` | `webhookEventLogEntrySchema` | `src/models/webhook-event-log-entry.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### receivePaypalWebhook

- **Signature**: `receivePaypalWebhook(request: Webhooks.ReceivePaypalWebhookRequest, options?: RequestOptions): ApiPromise<WebhookAck, Webhooks.ReceivePaypalWebhookError>`
- **Wire**: `POST /v1/webhooks/paypal`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field, a bare top-level JSON map with no fixed keys
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `WebhookAck`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Webhooks.ReceivePaypalWebhookError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"webhookRejected"` [400] `WebhookRejected` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Webhooks.ReceivePaypalWebhookRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `Record<string, unknown>` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `WebhookAck` | `webhookAckSchema` | `src/models/webhook-ack.ts` |
| `WebhookRejected` | `webhookRejectedSchema` | `src/models/webhook-rejected.ts` |

