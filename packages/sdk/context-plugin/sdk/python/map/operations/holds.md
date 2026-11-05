<!-- Generated file — do not edit; regenerated with the SDK. -->

# Holds — operations

Accessor: `client.holds` · Source: `ringfence_api/apis/holds.py` · 3 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.holds.confirm_ring

- **Route**: `POST /v1/rings/{id}/confirm`
- **Auth**: `bearer_auth`
- **Signature**: `def confirm_ring(id_: str, body: ConfirmRingRequest | ConfirmRingRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `body`
- **Params**: `id_` — path `id` · `body` — JSON body
- **Returns (parsed)**: `ConfirmRingResponse`
- **Returns (raw)**: `ApiResult[ConfirmRingResponse, ConfirmRingErrorBody]`
- **Error**: `ConfirmRingErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 404] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `ConfirmRingRequest` | `ringfence_api/models/confirm_ring_request.py` |
| `ConfirmRingRequestDict` | `ringfence_api/models/confirm_ring_request.py` |
| `ConfirmRingResponse` | `ringfence_api/models/confirm_ring_response.py` |
| `ConfirmRingErrorBody` | `ringfence_api/errors/confirm_ring_error.py` |
| `Error` | `ringfence_api/models/error.py` |

### client.holds.explain_ring

- **Route**: `GET /v1/rings/{id}`
- **Auth**: `bearer_auth`
- **Signature**: `def explain_ring(id_: str, run_id: str, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `run_id`
- **Params**: `id_` — path `id` · `run_id` — query
- **Returns (parsed)**: `RingExplanation`
- **Returns (raw)**: `ApiResult[RingExplanation, ExplainRingErrorBody]`
- **Error**: `ExplainRingErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 404] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `RingExplanation` | `ringfence_api/models/ring_explanation.py` |
| `ExplainRingErrorBody` | `ringfence_api/errors/explain_ring_error.py` |
| `Error` | `ringfence_api/models/error.py` |

### client.holds.release_holds

- **Route**: `POST /v1/holds/release`
- **Auth**: `bearer_auth`
- **Signature**: `def release_holds(body: ReleaseRequest | ReleaseRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `ReleaseResponse`
- **Returns (raw)**: `ApiResult[ReleaseResponse, ReleaseHoldsErrorBody]`
- **Error**: `ReleaseHoldsErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 409] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `ReleaseRequest` | `ringfence_api/models/release_request.py` |
| `ReleaseRequestDict` | `ringfence_api/models/release_request.py` |
| `ReleaseResponse` | `ringfence_api/models/release_response.py` |
| `ReleaseHoldsErrorBody` | `ringfence_api/errors/release_holds_error.py` |
| `Error` | `ringfence_api/models/error.py` |

