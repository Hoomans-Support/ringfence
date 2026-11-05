<!-- Generated file — do not edit; regenerated with the SDK. -->

# System — operations

Accessor: `client.system` · Source: `ringfence_api/apis/system.py` · 1 operation

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.system.health

- **Route**: `GET /health`
- **Signature**: `def health(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `HealthStatus`
- **Returns (raw)**: `ApiResult[HealthStatus, RawError]`
- **Error**: `RawError` — **Case B**

| Type | Source |
| --- | --- |
| `HealthStatus` | `ringfence_api/models/health_status.py` |

