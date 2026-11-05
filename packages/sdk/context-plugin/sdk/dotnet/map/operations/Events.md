<!-- Generated file — do not edit; regenerated with the SDK. -->

# Events — operations

Accessor: `client.Events` · Source: `src/RingfenceApi/Api/Events.cs` · 2 operations

**Type sources**: the file declaring each type an operation names (`RawError` excluded — see sdk-map.md).

### GetAtRiskAccounts

- **Auth**: `options.BearerAuth`
- **Signature**: `GetAtRiskAccounts(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Returns**: `AtRiskResult`
- **Error**: `ApiException<GetAtRiskAccountsError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [401] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `AtRiskResult` | `src/RingfenceApi/Models/AtRiskResult.cs` |
| `GetAtRiskAccountsError` | `src/RingfenceApi/Errors/GetAtRiskAccountsError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

### RecordEvent

- **Auth**: `options.BearerAuth`
- **Signature**: `RecordEvent(RecordEventRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `Acknowledged`
- **Error**: `ApiException<RecordEventError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [400, 401] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `RecordEventRequest` | `src/RingfenceApi/Requests/Events/RecordEventRequest.cs` |
| `SignupEvent` | `src/RingfenceApi/Models/SignupEvent.cs` |
| `Acknowledged` | `src/RingfenceApi/Models/Acknowledged.cs` |
| `RecordEventError` | `src/RingfenceApi/Errors/RecordEventError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

