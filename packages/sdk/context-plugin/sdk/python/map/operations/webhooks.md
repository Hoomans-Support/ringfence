<!-- Generated file — do not edit; regenerated with the SDK. -->

# Webhooks — operations

Accessor: `client.webhooks` · Source: `ringfence_api/apis/webhooks.py` · 2 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.webhooks.list_webhook_events

- **Route**: `GET /v1/webhooks/events`
- **Auth**: `admin_bearer_auth`
- **Signature**: `def list_webhook_events(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `list[WebhookEventLogEntry]`
- **Returns (raw)**: `ApiResult[list[WebhookEventLogEntry], ListWebhookEventsErrorBody]`
- **Error**: `ListWebhookEventsErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [404] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `WebhookEventLogEntry` | `ringfence_api/models/webhook_event_log_entry.py` |
| `ListWebhookEventsErrorBody` | `ringfence_api/errors/list_webhook_events_error.py` |
| `Error` | `ringfence_api/models/error.py` |

### client.webhooks.receive_paypal_webhook

- **Route**: `POST /v1/webhooks/paypal`
- **Signature**: `def receive_paypal_webhook(body: Any, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `WebhookAck`
- **Returns (raw)**: `ApiResult[WebhookAck, ReceivePaypalWebhookErrorBody]`
- **Error**: `ReceivePaypalWebhookErrorBody` — **Case A (typed)**
- **Error arms**: `WebhookRejected` [400] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `WebhookAck` | `ringfence_api/models/webhook_ack.py` |
| `ReceivePaypalWebhookErrorBody` | `ringfence_api/errors/receive_paypal_webhook_error.py` |
| `WebhookRejected` | `ringfence_api/models/webhook_rejected.py` |

