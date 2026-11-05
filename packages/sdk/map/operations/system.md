<!-- Generated file — do not edit; regenerated with the SDK. -->

# System — operations

Accessor: `client.system` · Source: `src/resources/system.ts` · 1 operation · Request types: namespace `System`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `ringfence-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### health

- **Signature**: `health(options?: RequestOptions): ApiPromise<HealthStatus, ApiError>`
- **Wire**: `GET /health`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `HealthStatus`
- **Error**: `RingfenceApiError` with `kind: "api"` — untyped, `payload.kind` always `"undeclared"`

| Type | Schema value | Source |
| --- | --- | --- |
| `HealthStatus` | `healthStatusSchema` | `src/models/health-status.ts` |

