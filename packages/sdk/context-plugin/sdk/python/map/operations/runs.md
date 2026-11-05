<!-- Generated file — do not edit; regenerated with the SDK. -->

# Runs — operations

Accessor: `client.runs` · Source: `ringfence_api/apis/runs.py` · 4 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.runs.get_payout_run

- **Route**: `GET /v1/payout-runs/{id}`
- **Auth**: `bearer_auth`
- **Signature**: `def get_payout_run(id_: str, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`
- **Params**: `id_` — path `id`
- **Returns (parsed)**: `RunResponse`
- **Returns (raw)**: `ApiResult[RunResponse, GetPayoutRunErrorBody]`
- **Error**: `GetPayoutRunErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 404] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `RunResponse` | `ringfence_api/models/run_response.py` |
| `GetPayoutRunErrorBody` | `ringfence_api/errors/get_payout_run_error.py` |
| `Error` | `ringfence_api/models/error.py` |

### client.runs.import_payout_run

- **Route**: `POST /v1/payout-runs/import`
- **Auth**: `bearer_auth`
- **Signature**: `def import_payout_run(body: ImportRunRequest | ImportRunRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `RunResponse`
- **Returns (raw)**: `ApiResult[RunResponse, ImportPayoutRunErrorBody]`
- **Error**: `ImportPayoutRunErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 409] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `ImportRunRequest` | `ringfence_api/models/import_run_request.py` |
| `ImportRunRequestDict` | `ringfence_api/models/import_run_request.py` |
| `RunResponse` | `ringfence_api/models/run_response.py` |
| `ImportPayoutRunErrorBody` | `ringfence_api/errors/import_payout_run_error.py` |
| `Error` | `ringfence_api/models/error.py` |

### client.runs.screen_payees

- **Route**: `POST /v1/screen`
- **Auth**: `bearer_auth`
- **Signature**: `def screen_payees(body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `ScreenResult`
- **Returns (raw)**: `ApiResult[ScreenResult, ScreenPayeesErrorBody]`
- **Error**: `ScreenPayeesErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `RunRequest` | `ringfence_api/models/run_request.py` |
| `RunRequestDict` | `ringfence_api/models/run_request.py` |
| `ScreenResult` | `ringfence_api/models/screen_result.py` |
| `ScreenPayeesErrorBody` | `ringfence_api/errors/screen_payees_error.py` |
| `Error` | `ringfence_api/models/error.py` |

### client.runs.submit_payout_run

- **Route**: `POST /v1/payout-runs`
- **Auth**: `bearer_auth`
- **Signature**: `def submit_payout_run(body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `RunResponse`
- **Returns (raw)**: `ApiResult[RunResponse, SubmitPayoutRunErrorBody]`
- **Error**: `SubmitPayoutRunErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 409] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `RunRequest` | `ringfence_api/models/run_request.py` |
| `RunRequestDict` | `ringfence_api/models/run_request.py` |
| `RunResponse` | `ringfence_api/models/run_response.py` |
| `SubmitPayoutRunErrorBody` | `ringfence_api/errors/submit_payout_run_error.py` |
| `Error` | `ringfence_api/models/error.py` |

