<!-- Generated file — do not edit; regenerated with the SDK. -->

# Runs — operations

Accessor: `client.Runs` · Source: `src/RingfenceApi/Api/Runs.cs` · 4 operations

**Type sources**: the file declaring each type an operation names (`RawError` excluded — see sdk-map.md).

### GetPayoutRun

- **Auth**: `options.BearerAuth`
- **Signature**: `GetPayoutRun(GetPayoutRunRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Id`
- **Returns**: `RunResponse`
- **Error**: `ApiException<GetPayoutRunError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [401, 404] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `GetPayoutRunRequest` | `src/RingfenceApi/Requests/Runs/GetPayoutRunRequest.cs` |
| `RunResponse` | `src/RingfenceApi/Models/RunResponse.cs` |
| `GetPayoutRunError` | `src/RingfenceApi/Errors/GetPayoutRunError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

### ImportPayoutRun

- **Auth**: `options.BearerAuth`
- **Signature**: `ImportPayoutRun(ImportPayoutRunRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `RunResponse`
- **Error**: `ApiException<ImportPayoutRunError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [400, 401, 409] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `ImportPayoutRunRequest` | `src/RingfenceApi/Requests/Runs/ImportPayoutRunRequest.cs` |
| `ImportRunRequest` | `src/RingfenceApi/Models/ImportRunRequest.cs` |
| `RunResponse` | `src/RingfenceApi/Models/RunResponse.cs` |
| `ImportPayoutRunError` | `src/RingfenceApi/Errors/ImportPayoutRunError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

### ScreenPayees

- **Auth**: `options.BearerAuth`
- **Signature**: `ScreenPayees(ScreenPayeesRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `ScreenResult`
- **Error**: `ApiException<ScreenPayeesError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [400, 401] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `ScreenPayeesRequest` | `src/RingfenceApi/Requests/Runs/ScreenPayeesRequest.cs` |
| `RunRequest` | `src/RingfenceApi/Models/RunRequest.cs` |
| `ScreenResult` | `src/RingfenceApi/Models/ScreenResult.cs` |
| `ScreenPayeesError` | `src/RingfenceApi/Errors/ScreenPayeesError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

### SubmitPayoutRun

- **Auth**: `options.BearerAuth`
- **Signature**: `SubmitPayoutRun(SubmitPayoutRunRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `RunResponse`
- **Error**: `ApiException<SubmitPayoutRunError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [400, 401, 409] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `SubmitPayoutRunRequest` | `src/RingfenceApi/Requests/Runs/SubmitPayoutRunRequest.cs` |
| `RunRequest` | `src/RingfenceApi/Models/RunRequest.cs` |
| `RunResponse` | `src/RingfenceApi/Models/RunResponse.cs` |
| `SubmitPayoutRunError` | `src/RingfenceApi/Errors/SubmitPayoutRunError.cs` |
| `Error` | `src/RingfenceApi/Models/Error.cs` |

