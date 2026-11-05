<!-- Generated file — do not edit; regenerated with the SDK. -->

# Holds — operations

Accessor: `client.Holds` · Source: `src/RingfenceApi/Api/Holds.cs` · 3 operations

**Type sources**: the file declaring each type an operation names (`RawError` excluded — see sdk-map.md).

### ConfirmRing

- **Auth**: `options.BearerAuth`
- **Signature**: `ConfirmRing(ConfirmRingOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Id`, `Body`
- **Returns**: `ConfirmRingResponse`
- **Error**: `ApiException<ConfirmRingError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [401, 404] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `ConfirmRingOperationRequest` | `src/RingfenceApi/Requests/Holds/ConfirmRingOperationRequest.cs` |
| `ConfirmRingRequest` | `src/RingfenceApi/Models/ConfirmRingRequest.cs` |
| `ConfirmRingResponse` | `src/RingfenceApi/Models/ConfirmRingResponse.cs` |
| `ConfirmRingError` | `src/RingfenceApi/Errors/ConfirmRingError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

### ExplainRing

- **Auth**: `options.BearerAuth`
- **Signature**: `ExplainRing(ExplainRingRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Id`, `RunId`
- **Query params (wire ← C#)**: `run_id` ← `RunId`
- **Returns**: `RingExplanation`
- **Error**: `ApiException<ExplainRingError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [401, 404] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `ExplainRingRequest` | `src/RingfenceApi/Requests/Holds/ExplainRingRequest.cs` |
| `RingExplanation` | `src/RingfenceApi/Models/RingExplanation.cs` |
| `ExplainRingError` | `src/RingfenceApi/Errors/ExplainRingError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

### ReleaseHolds

- **Auth**: `options.BearerAuth`
- **Signature**: `ReleaseHolds(ReleaseHoldsRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `ReleaseResponse`
- **Error**: `ApiException<ReleaseHoldsError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [400, 401, 409] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `ReleaseHoldsRequest` | `src/RingfenceApi/Requests/Holds/ReleaseHoldsRequest.cs` |
| `ReleaseRequest` | `src/RingfenceApi/Models/ReleaseRequest.cs` |
| `ReleaseResponse` | `src/RingfenceApi/Models/ReleaseResponse.cs` |
| `ReleaseHoldsError` | `src/RingfenceApi/Errors/ReleaseHoldsError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

