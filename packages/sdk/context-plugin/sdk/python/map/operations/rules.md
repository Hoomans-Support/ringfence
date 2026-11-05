<!-- Generated file — do not edit; regenerated with the SDK. -->

# Rules — operations

Accessor: `client.rules` · Source: `ringfence_api/apis/rules.py` · 3 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.rules.approve_rule

- **Route**: `POST /v1/rules/{id}/approve`
- **Auth**: `bearer_auth`
- **Signature**: `def approve_rule(id_: str, body: ApproveRuleRequest | ApproveRuleRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `body`
- **Params**: `id_` — path `id` · `body` — JSON body
- **Returns (parsed)**: `StoredRule`
- **Returns (raw)**: `ApiResult[StoredRule, ApproveRuleErrorBody]`
- **Error**: `ApproveRuleErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401, 404, 409] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `ApproveRuleRequest` | `ringfence_api/models/approve_rule_request.py` |
| `ApproveRuleRequestDict` | `ringfence_api/models/approve_rule_request.py` |
| `StoredRule` | `ringfence_api/models/stored_rule.py` |
| `ApproveRuleErrorBody` | `ringfence_api/errors/approve_rule_error.py` |
| `Error` | `ringfence_api/models/error.py` |

### client.rules.list_rules

- **Route**: `GET /v1/rules`
- **Auth**: `bearer_auth`
- **Signature**: `def list_rules(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `list[StoredRule]`
- **Returns (raw)**: `ApiResult[list[StoredRule], ListRulesErrorBody]`
- **Error**: `ListRulesErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [401] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `StoredRule` | `ringfence_api/models/stored_rule.py` |
| `ListRulesErrorBody` | `ringfence_api/errors/list_rules_error.py` |
| `Error` | `ringfence_api/models/error.py` |

### client.rules.propose_rule

- **Route**: `POST /v1/rules`
- **Auth**: `bearer_auth`
- **Signature**: `def propose_rule(body: ProposeRuleRequest | ProposeRuleRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `StoredRule`
- **Returns (raw)**: `ApiResult[StoredRule, ProposeRuleErrorBody]`
- **Error**: `ProposeRuleErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `ProposeRuleRequest` | `ringfence_api/models/propose_rule_request.py` |
| `ProposeRuleRequestDict` | `ringfence_api/models/propose_rule_request.py` |
| `StoredRule` | `ringfence_api/models/stored_rule.py` |
| `ProposeRuleErrorBody` | `ringfence_api/errors/propose_rule_error.py` |
| `Error` | `ringfence_api/models/error.py` |

