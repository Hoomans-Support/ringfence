<!-- Generated file — do not edit; regenerated with the SDK. -->

# Events — operations

Accessor: `client.events` · Source: `src/resources/events.ts` · 2 operations · Request and error types: namespace `Events`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `ringfence-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### getAtRiskAccounts

- **Signature**: `getAtRiskAccounts(options?: RequestOptions): ApiPromise<AtRiskResult, Events.GetAtRiskAccountsError>`
- **Wire**: `GET /v1/events/at-risk`
- **Auth**: `bearerAuth`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `AtRiskResult`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Events.GetAtRiskAccountsError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `AtRiskResult` | `atRiskResultSchema` | `src/models/at-risk-result.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### recordEvent

- **Signature**: `recordEvent(request: Events.RecordEventRequest, options?: RequestOptions): ApiPromise<Acknowledged, Events.RecordEventError>`
- **Wire**: `POST /v1/events`
- **Auth**: `bearerAuth`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `Acknowledged`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Events.RecordEventError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Events.RecordEventRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `SignupEvent` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `SignupEvent` | `signupEventSchema` | `src/models/signup-event.ts` |
| `Acknowledged` | `acknowledgedSchema` | `src/models/acknowledged.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

