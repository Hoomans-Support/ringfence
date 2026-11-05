<!-- Generated file — do not edit; regenerated with the SDK. -->

# Events — operations

Accessor: `client.events` · Source: `ringfence_api/apis/events.py` · 2 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.events.get_at_risk_accounts

- **Route**: `GET /v1/events/at-risk`
- **Auth**: `bearer_auth`
- **Signature**: `def get_at_risk_accounts(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `AtRiskResult`
- **Returns (raw)**: `ApiResult[AtRiskResult, GetAtRiskAccountsErrorBody]`
- **Error**: `GetAtRiskAccountsErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `AtRiskResult` | `ringfence_api/models/at_risk_result.py` |
| `GetAtRiskAccountsErrorBody` | `ringfence_api/errors/get_at_risk_accounts_error.py` |
| `Error` | `ringfence_api/models/error.py` |

### client.events.record_event

- **Route**: `POST /v1/events`
- **Auth**: `bearer_auth`
- **Signature**: `def record_event(body: SignupEvent | SignupEventDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `Acknowledged`
- **Returns (raw)**: `ApiResult[Acknowledged, RecordEventErrorBody]`
- **Error**: `RecordEventErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `SignupEvent` | `ringfence_api/models/signup_event.py` |
| `SignupEventDict` | `ringfence_api/models/signup_event.py` |
| `Acknowledged` | `ringfence_api/models/acknowledged.py` |
| `RecordEventErrorBody` | `ringfence_api/errors/record_event_error.py` |
| `Error` | `ringfence_api/models/error.py` |

