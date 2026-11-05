<!-- Generated file — do not edit; regenerated with the SDK. -->

# WebhooksApi — operations

Accessor: `client.WebhooksApi` · Source: `src/RingfenceApi/Api/WebhooksApi.cs` · 2 operations

**Type sources**: the file declaring each type an operation names (`RawError` excluded — see sdk-map.md).

### ListWebhookEvents

- **Auth**: `options.AdminBearerAuth`
- **Signature**: `ListWebhookEvents(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Returns**: `IReadOnlyList<WebhookEventLogEntry>`
- **Error**: `ApiException<ListWebhookEventsError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [404] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `WebhookEventLogEntry` | `src/RingfenceApi/Models/WebhookEventLogEntry.cs` |
| `ListWebhookEventsError` | `src/RingfenceApi/Errors/ListWebhookEventsError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

### ReceivePaypalWebhook

- **Signature**: `ReceivePaypalWebhook(ReceivePaypalWebhookRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `WebhookAck`
- **Error**: `ApiException<ReceivePaypalWebhookError>` — **Case A (typed)**
- **Error accessors**: `TryGetWebhookRejected(out WebhookRejected)` [400] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `ReceivePaypalWebhookRequest` | `src/RingfenceApi/Requests/WebhooksApi/ReceivePaypalWebhookRequest.cs` |
| `WebhookAck` | `src/RingfenceApi/Models/WebhookAck.cs` |
| `ReceivePaypalWebhookError` | `src/RingfenceApi/Errors/ReceivePaypalWebhookError.cs` |
| `WebhookRejected` | `src/RingfenceApi/Models/WebhookRejected.cs` |

