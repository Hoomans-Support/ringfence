<!-- Generated file — do not edit; regenerated with the SDK. -->

# Runs — operations

Accessor: `client.runs` · Source: `src/resources/runs.ts` · 4 operations · Request and error types: namespace `Runs`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `ringfence-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### getPayoutRun

- **Signature**: `getPayoutRun(request: Runs.GetPayoutRunRequest, options?: RequestOptions): ApiPromise<RunResponse, Runs.GetPayoutRunError>`
- **Wire**: `GET /v1/payout-runs/{id}`
- **Auth**: `bearerAuth`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `RunResponse`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Runs.GetPayoutRunError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [404] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Runs.GetPayoutRunRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `id` | `path` | `string` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `RunResponse` | `runResponseSchema` | `src/models/run-response.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### importPayoutRun

- **Signature**: `importPayoutRun(request: Runs.ImportPayoutRunRequest, options?: RequestOptions): ApiPromise<RunResponse, Runs.ImportPayoutRunError>`
- **Wire**: `POST /v1/payout-runs/import`
- **Auth**: `bearerAuth`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `RunResponse`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Runs.ImportPayoutRunError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [409] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Runs.ImportPayoutRunRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `ImportRunRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `ImportRunRequest` | `importRunRequestSchema` | `src/models/import-run-request.ts` |
| `RunResponse` | `runResponseSchema` | `src/models/run-response.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### screenPayees

- **Signature**: `screenPayees(request: Runs.ScreenPayeesRequest, options?: RequestOptions): ApiPromise<ScreenResult, Runs.ScreenPayeesError>`
- **Wire**: `POST /v1/screen`
- **Auth**: `bearerAuth`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ScreenResult`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Runs.ScreenPayeesError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Runs.ScreenPayeesRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `RunRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `RunRequest` | `runRequestSchema` | `src/models/run-request.ts` |
| `ScreenResult` | `screenResultSchema` | `src/models/screen-result.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### submitPayoutRun

- **Signature**: `submitPayoutRun(request: Runs.SubmitPayoutRunRequest, options?: RequestOptions): ApiPromise<RunResponse, Runs.SubmitPayoutRunError>`
- **Wire**: `POST /v1/payout-runs`
- **Auth**: `bearerAuth`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `RunResponse`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Runs.SubmitPayoutRunError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [409] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Runs.SubmitPayoutRunRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `RunRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `RunRequest` | `runRequestSchema` | `src/models/run-request.ts` |
| `RunResponse` | `runResponseSchema` | `src/models/run-response.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

