<!-- Generated file — do not edit; regenerated with the SDK. -->

# Rules — operations

Accessor: `client.rules` · Source: `src/resources/rules.ts` · 3 operations · Request and error types: namespace `Rules`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `ringfence-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### approveRule

- **Signature**: `approveRule(request: Rules.ApproveRuleRequestParams, options?: RequestOptions): ApiPromise<StoredRule, Rules.ApproveRuleError>`
- **Wire**: `POST /v1/rules/{id}/approve`
- **Auth**: `bearerAuth`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `StoredRule`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Rules.ApproveRuleError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"error2"` [404] `Error` · `"error3"` [409] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Rules.ApproveRuleRequestParams` (2):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `id` | `path` | `string` | yes |
| `body` | `body` | `ApproveRuleRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `ApproveRuleRequest` | `approveRuleRequestSchema` | `src/models/approve-rule-request.ts` |
| `StoredRule` | `storedRuleSchema` | `src/models/stored-rule.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### listRules

- **Signature**: `listRules(options?: RequestOptions): ApiPromise<StoredRule[], Rules.ListRulesError>`
- **Wire**: `GET /v1/rules`
- **Auth**: `bearerAuth`
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `StoredRule[]` — a bare `application/json` array; the success type *is* the array, not a wrapper model
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Rules.ListRulesError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [401] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

| Type | Schema value | Source |
| --- | --- | --- |
| `StoredRule` | `storedRuleSchema` | `src/models/stored-rule.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### proposeRule

- **Signature**: `proposeRule(request: Rules.ProposeRuleRequestParams, options?: RequestOptions): ApiPromise<StoredRule, Rules.ProposeRuleError>`
- **Wire**: `POST /v1/rules`
- **Auth**: `bearerAuth`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `StoredRule`
- **Error**: `RingfenceApiError` with `kind: "api"`, an instance of `Rules.ProposeRuleError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Rules.ProposeRuleRequestParams` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `ProposeRuleRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `ProposeRuleRequest` | `proposeRuleRequestSchema` | `src/models/propose-rule-request.ts` |
| `StoredRule` | `storedRuleSchema` | `src/models/stored-rule.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

