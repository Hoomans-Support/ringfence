<!-- Generated file — do not edit; regenerated with the SDK. -->

# Holds — operations

Accessor: `client.holds` · Source: `src/resources/holds.ts` · 3 operations · Request and error types: namespace `Holds`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `ringfence-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### confirmRing

- **Signature**: `confirmRing(request: Holds.ConfirmRingRequestParams, options?: RequestOptions): ApiPromise<ConfirmRingResponse, Holds.ConfirmRingError>`
- **Wire**: `POST /v1/rings/{id}/confirm`
- **Auth**: `bearerAuth`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ConfirmRingResponse`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Holds.ConfirmRingError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [404] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Holds.ConfirmRingRequestParams` (2):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `id` | `path` | `string` | yes |
| `body` | `body` | `ConfirmRingRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `ConfirmRingRequest` | `confirmRingRequestSchema` | `src/models/confirm-ring-request.ts` |
| `ConfirmRingResponse` | `confirmRingResponseSchema` | `src/models/confirm-ring-response.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### explainRing

- **Signature**: `explainRing(request: Holds.ExplainRingRequest, options?: RequestOptions): ApiPromise<RingExplanation, Holds.ExplainRingError>`
- **Wire**: `GET /v1/rings/{id}`
- **Auth**: `bearerAuth`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `RingExplanation`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Holds.ExplainRingError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [404] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Holds.ExplainRingRequest` (2):

| Field | Channel | Wire | Type | Req |
| --- | --- | --- | --- | --- |
| `id` | `path` | — | `string` | yes |
| `runId` | `query` | `run_id` | `string` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `RingExplanation` | `ringExplanationSchema` | `src/models/ring-explanation.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### releaseHolds

- **Signature**: `releaseHolds(request: Holds.ReleaseHoldsRequest, options?: RequestOptions): ApiPromise<ReleaseResponse, Holds.ReleaseHoldsError>`
- **Wire**: `POST /v1/holds/release`
- **Auth**: `bearerAuth`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ReleaseResponse`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Holds.ReleaseHoldsError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [409] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Holds.ReleaseHoldsRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `ReleaseRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `ReleaseRequest` | `releaseRequestSchema` | `src/models/release-request.ts` |
| `ReleaseResponse` | `releaseResponseSchema` | `src/models/release-response.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

