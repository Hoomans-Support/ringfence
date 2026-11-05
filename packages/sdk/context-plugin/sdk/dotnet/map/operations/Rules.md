<!-- Generated file — do not edit; regenerated with the SDK. -->

# Rules — operations

Accessor: `client.Rules` · Source: `src/RingfenceApi/Api/Rules.cs` · 3 operations

**Type sources**: the file declaring each type an operation names (`RawError` excluded — see sdk-map.md).

### ApproveRule

- **Auth**: `options.BearerAuth`
- **Signature**: `ApproveRule(ApproveRuleOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Id`, `Body`
- **Returns**: `StoredRule`
- **Error**: `ApiException<ApproveRuleError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [401, 404, 409] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `ApproveRuleOperationRequest` | `src/RingfenceApi/Requests/Rules/ApproveRuleOperationRequest.cs` |
| `ApproveRuleRequest` | `src/RingfenceApi/Models/ApproveRuleRequest.cs` |
| `StoredRule` | `src/RingfenceApi/Models/StoredRule.cs` |
| `ApproveRuleError` | `src/RingfenceApi/Errors/ApproveRuleError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

### ListRules

- **Auth**: `options.BearerAuth`
- **Signature**: `ListRules(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Returns**: `IReadOnlyList<StoredRule>`
- **Error**: `ApiException<ListRulesError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [401] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `StoredRule` | `src/RingfenceApi/Models/StoredRule.cs` |
| `ListRulesError` | `src/RingfenceApi/Errors/ListRulesError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

### ProposeRule

- **Auth**: `options.BearerAuth`
- **Signature**: `ProposeRule(ProposeRuleOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `StoredRule`
- **Error**: `ApiException<ProposeRuleError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [400, 401] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `ProposeRuleOperationRequest` | `src/RingfenceApi/Requests/Rules/ProposeRuleOperationRequest.cs` |
| `ProposeRuleRequest` | `src/RingfenceApi/Models/ProposeRuleRequest.cs` |
| `StoredRule` | `src/RingfenceApi/Models/StoredRule.cs` |
| `ProposeRuleError` | `src/RingfenceApi/Errors/ProposeRuleError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

