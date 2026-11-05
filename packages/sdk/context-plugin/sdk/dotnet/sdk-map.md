<!-- Generated file — do not edit; regenerated with the SDK. -->

# SDK map — Ringfence API (.NET)

> A generated table of contents for this SDK. Consult this map and its sub-pages to learn signatures, error types, and server/auth wiring **by lookup**. Model shapes and enum values are *not* duplicated here — the map names the file declaring each type; read the shape there. The compiler is the backstop: a wrong name fails to build.

|  |  |
| --- | --- |
| SDK display name | Ringfence API |
| Root namespace | `RingfenceApi` |
| Target framework | `netstandard2.0` (C# `LangVersion 14`, `Nullable enable`) |
| API spec version | `0.0.1` |
| Generator | APIMatic |

Staleness check: the API spec version above changes when the SDK is regenerated from a new spec. If a lookup here fails to compile, trust the compiler and re-read the source file named in the row.

All `Source` paths on this map and its sub-pages are relative to the **SDK root** — the directory holding this file — never to the page that carries them; the project file is `src/RingfenceApi/RingfenceApi.csproj`. Open them as-is from the SDK root, from any page; if the SDK sits under a subdirectory of a larger repo, prefix that subdirectory.

---

## Getting a client

```csharp
var httpClient = new HttpClient();
// TODO: configure more client options here
var options = new RingfenceApiClientOptions
{
    BearerAuth = "YOUR_BEARER_TOKEN",
    AdminBearerAuth = "YOUR_BEARER_TOKEN",
    Environment = ServerEnvironment.Production,
};
var client = new RingfenceApiClient(httpClient, options);
```

DI alternative (`services.AddRingfenceApiClient`):

```csharp
services.AddRingfenceApiClient(options =>
{
    options.BearerAuth = "YOUR_BEARER_TOKEN";
    options.AdminBearerAuth = "YOUR_BEARER_TOKEN";
    options.Environment = ServerEnvironment.Production;
    // TODO: configure more client options here
});
```

Every API group is a property on the client (e.g. `client.Events`). Source: `src/RingfenceApi/RingfenceApiClient.cs`. The only constructor is `RingfenceApiClient(HttpClient httpClient, RingfenceApiClientOptions options)`.

All `RingfenceApiClientOptions` properties (source: `src/RingfenceApi/RingfenceApiClientOptions.cs`):

| Property | Type |
| --- | --- |
| `Environment` | `ServerEnvironment` |
| `Retry` | `RetryOptions` |
| `Logging` | `LoggingOptions` |
| `TimeProvider` | `TimeProvider` |
| `Server` | `ServerOptions` |
| `StreamReadTimeout` | `TimeSpan?` |
| `Hooks` | `IReadOnlyList<SdkHook>` |
| `BearerAuth` | `string?` |
| `BearerAuthProvider` | `CredentialProvider<string>?` |
| `AdminBearerAuth` | `string?` |
| `AdminBearerAuthProvider` | `CredentialProvider<string>?` |

`ServerEnvironment` (source: `src/RingfenceApi/Servers/ServerEnvironment.cs`, namespace `RingfenceApi.Servers`)

`RetryOptions` members (namespace `RingfenceApi.Core.Configuration` — add `using RingfenceApi.Core.Configuration;`; source: `src/RingfenceApi/Core/Configuration/RetryOptions.cs`; all members are `required`, so build a full instance or start from `RetryOptions.Default()`):

| Member | Type |
| --- | --- |
| `StatusCodesToRetry` | `IReadOnlyList<HttpStatusCode>` |
| `HttpMethodsToRetry` | `IReadOnlyList<HttpMethod>` |
| `MaxRetries` | `int` |
| `Delay` | `TimeSpan` |
| `Timeout` | `TimeSpan?` |
| `BackOffFactor` | `int` |
| `UseExponentialBackoff` | `bool` |
| `MaxJitter` | `TimeSpan` |
| `OnRetry` | `Action<RetryAttempt>?` |

---

## Error-handling model (read once — applies to every operation)

Operations are **throw-based**. On an error status the SDK throws `ApiException<TError>` (`src/RingfenceApi/Core/Exceptions/ApiException.cs`, namespace `RingfenceApi.Core.Exceptions`) exposing `.Error` of type `TError` beside the `StatusCode`, `Headers` and `ContentType` of the response. There are two cases:

- **Case A — typed error.** `TError` is a generated `…Error : ApiError` class (namespace `RingfenceApi.Errors`) with status-specific `TryGet…(out …)` accessors (each returns `true` when that shape is present) plus the inherited `TryGetRawError(out RawError)` fallback. The operation blocks name the exact `TryGet…` methods and the HTTP status each maps to.
- **Case B — raw error.** `TError` is `RawError` (`src/RingfenceApi/Core/ErrorResponse/RawError.cs`, namespace `RingfenceApi.Core.ErrorResponse`): `StatusCode: HttpStatusCode` · `ReadAsBytes(): ReadOnlyMemory<byte>` · `ReadAsString(): string` · `ReadAsJson<T>(): T?`.

⚠ Each of the three lives in its own namespace. `src/RingfenceApi/Core/` holds several namespaces, so a catch block naming `ApiException<T>`, a typed `{Operation}Error` and `RawError` together needs a `using` for each.

`ApiException<TError>` is one leaf of the `SdkException` family (`src/RingfenceApi/Core/Exceptions/SdkException.cs`): a request that produced no usable response surfaces as `SdkConnectionException` or `SdkTimeoutException`, a body that does not match its declared type as `ResponseDeserializationException`, and a required credential that is not configured, or one that could not be applied, as `AuthSchemeException`. Every one of them names the failed call. The full table is in [README → Error Handling](README.md#error-handling).

Core error types (`src/RingfenceApi/Core/ErrorResponse/`) — public members with their **declared types**, verbatim from source:

| Type | Public members | Source |
| --- | --- | --- |
| `ApiError` — abstract base of the 14 typed error classes in `src/RingfenceApi/Errors/` | `TryGetRawError(out RawError error): bool` | `src/RingfenceApi/Core/ErrorResponse/ApiError.cs` |
| `RawError` | `StatusCode: HttpStatusCode` · `ReadAsBytes(): ReadOnlyMemory<byte>` · `ReadAsString(): string` · `ReadAsJson<T>(): T?` | `src/RingfenceApi/Core/ErrorResponse/RawError.cs` |

Typed-error payload shapes (the `out` types in each operation page's error-accessor cells) are ordinary records/unions — no special handling. The operation's **Type sources** table gives the file that declares each one; read field names, declared types, and JSON wire names there, as for any other model.

```csharp
try
{
    var response = await client.Events.GetAtRiskAccounts();
}
catch (ApiException<GetAtRiskAccountsError> ex)
{
    // Case A — typed error
    if (ex.Error.TryGetError(out var error))
    {
        // Handle 401
    }
    else if (ex.Error.TryGetRawError(out var raw))
    {
        // Any other error status
    }
}
catch (ApiException<RawError> ex)
{
    // Case B — raw error
    // ex.Error.StatusCode, ex.Error.ReadAsString(), ex.Error.ReadAsJson<T>()
}
```

**No-throw (`…Result`) variants: absent across this SDK** — every operation is throw-only. Of **15 operations**, **14 are Case A (typed)** and **1 is Case B (raw)**.

---

## Operations — by controller (6 groups, 15 operations)

Each links to a sub-page with one row per operation: signature, the request record's required members, query-param wire names, return type, error Case A/B, and Case A's typed accessors with their statuses. Each operation also carries a **Type sources** table — every type it names, with the file that declares it — so resolving a body, return, or error payload to its source is a lookup, never a search. `RawError` is excluded there (its members and path are above); an operation with no table names nothing but primitives and `RawError`.

**Each row states what is specific to its operation. Everything below holds for EVERY operation unless that operation's row says otherwise, so a row silent on one of these points is telling you the default here applies — take it and move on rather than opening the source to confirm it.**

| Applies to every operation | Stated where | A row appears only when |
| --- | --- | --- |
| **Throw-only** — no `…Result`/no-throw variant exists anywhere in this SDK | this page, Error-handling model | a no-throw sibling exists (none do at this SDK version) |
| **No pagination** — the operation returns a single response, not a `Pageable` | here | pagination is offered — the block carries a **Pagination** bullet naming the posture (page-, offset-, cursor- or link-based, or the `page`-without-page-size case) |
| **Case B error accessors are always these four** — `StatusCode: HttpStatusCode` · `ReadAsBytes(): ReadOnlyMemory<byte>` · `ReadAsString(): string` · `ReadAsJson<T>(): T?` | the `RawError` row above | never — a `Case B` label always implies exactly these four; Case A rows list their own typed accessors |
| **Server group `Default`** — base URL per Servers & auth below | here | the operation is on another group — its block carries a **Server group** bullet |
| **Inputs are one request record** — an operation that takes input takes a single request record as its first parameter; build it with an object initializer, using the property names in the record's source (its file is in the operation's **Type sources**). A member the row does not list as required is optional or already carries the spec's default | here | never — it always holds |

**The HTTP verb and route live on the operation itself**, in the source file named at the top of its operations page. This map is method-first: the C# method is the interface you call. When something wire-level needs the route — reproducing a raw request, pointing the client at a mock, reading a provider-side log — read it from that file; do not reconstruct it from memory or infer it from the method name.

**The endpoint's behavioural prose lives there too**, as the XML `<remarks>` on the method. Rows here give you the contract — names, types, shapes, errors. Where an operation's *semantics* decide what you must pass — a parameter whose value changes server-side behaviour, an ordering or exclusivity rule between fields — that is what `<remarks>` settles; read it there rather than filling it in from memory.

| Controller (`client.X`) | Ops | Page |
| --- | --- | --- |
| `Events` | 2 | [map/operations/Events.md](map/operations/Events.md) |
| `Holds` | 3 | [map/operations/Holds.md](map/operations/Holds.md) |
| `Rules` | 3 | [map/operations/Rules.md](map/operations/Rules.md) |
| `Runs` | 4 | [map/operations/Runs.md](map/operations/Runs.md) |
| `SystemApi` | 1 | [map/operations/SystemApi.md](map/operations/SystemApi.md) |
| `WebhooksApi` | 2 | [map/operations/WebhooksApi.md](map/operations/WebhooksApi.md) |

---

## Models — where they live, how to build them

**Shapes live only in the source.** Every file under `src/RingfenceApi/Models/`, `src/RingfenceApi/Errors/` and `src/RingfenceApi/Requests/` declares exactly one public type, named after the file, and no two share a name — so a type name *is* its path. Take it from the operation's **Type sources** table, or build it from the kind's directory below. Never grep for a type.

| Group | Count | Directory (file = `<TypeName>.cs`) |
| --- | --- | --- |
| Records (plain `record` data models) | 41 | `src/RingfenceApi/Models/` |
| Enums (`OpenStringEnum<T>` / `OpenIntEnum<T>`) — C# member names + wire values | 7 | `src/RingfenceApi/Models/Enums/` |
| Typed error classes (`: ApiError`, one per Case A operation) | 14 | `src/RingfenceApi/Errors/` |
| Request records (one per operation that takes input; never serialized) | 11 | `src/RingfenceApi/Requests/` — a controller's records sit in a folder named after it (an operation with several tags is filed under the first tag it declares) |

Conventions: records are immutable, `init`-only; `required` properties must be set in the object initializer; `T?` is optional. A field's wire name is its `[JsonPropertyName]` and often differs from the C# name (`AmountInCents` ↔ `amount_in_cents`) — read it off the property, don't derive it. `OneOf`/`AnyOf` unions wrap `Optional<T>` variants — build via static factory or implicit conversion, read via `TryGet…(out …)`; `AllOf` compositions are not unions — every constituent is a `required` property, so set them all, and those constituent properties carry no `[JsonPropertyName]` and have no wire name of their own, because the generated converter flattens each constituent's own fields directly into the one parent JSON object. Enums are **not** C# enums — use the static members, whose names are PascalCase even when the wire value isn't (`CollectionMethod.Invoice`, not `.invoice`); there is no public factory, so resolve a raw value with `TryGetKnownValue` and branch with the generated `Match`, whose `otherwise` arm receives any value the SDK does not declare.

Namespaces by content type (add `using` accordingly):

| Contents | Namespace |
| --- | --- |
| Client & options (root) | `RingfenceApi` |
| Operation controllers (`src/RingfenceApi/Api/`) | `RingfenceApi.Api` |
| Records (`src/RingfenceApi/Models/`) | `RingfenceApi.Models` |
| Enums (`src/RingfenceApi/Models/Enums/`) | `RingfenceApi.Models.Enums` |
| Error classes (`src/RingfenceApi/Errors/`) | `RingfenceApi.Errors` |
| Request records (`src/RingfenceApi/Requests/`) | `RingfenceApi.Requests` — plus `.<Controller>` for a controller's records (an operation with several tags is filed under the first tag it declares) |

---

## Servers & auth

**Bearer token.** Set `options.BearerAuth = "<token>"`, or `options.BearerAuthProvider` to a delegate asked on every request. A program's full API key, or its read-only MCP key for `GET` routes and `POST /v1/screen`.

**Bearer token.** Set `options.AdminBearerAuth = "<token>"`, or `options.AdminBearerAuthProvider` to a delegate asked on every request. The deployment's `ADMIN_TOKEN`, unrelated to any program's key.

Operation blocks name their credential in an **Auth** bullet; an operation whose spec declares no scheme carries no such bullet.

- `AND` — every credential listed must be configured; the call fails before anything is sent, naming each one that is not.
- `OR` — the first configured credential that applies is sent, in the order listed; a configured one that fails falls through to the next; when none is configured the call fails before anything is sent, naming all of them.
- `OR anonymous` — the operation accepts anonymous callers: it is authenticated when a whole alternative listed before it is configured (every credential in an AND group), and sent without credentials otherwise.
- `(scopes: …)` — the OAuth2 scopes the operation's token is requested with; a client-credentials scheme mints one token per scope set.

A required credential you never configured fails the call with `AuthSchemeException` before anything is sent, so a `401` on an operation that requires a credential means the server rejected the one that was sent. A credential option left `null` is read from an environment variable when the client is constructed; the README's **Credentials from environment variables** table names them. A value set in code always wins, including the placeholder assignments in the **Getting a client** sample; delete the line for any credential you supply through an environment variable.

**Environments.** `options.Environment` selects the target environment (`src/RingfenceApi/Servers/ServerEnvironment.cs`):

| Environment | Value | Hosting |
| --- | --- | --- |
| `ServerEnvironment.Production` *(default)* | `production` | Local (PGlite in memory, mock PayPal by default) |
| `ServerEnvironment.Environment2` | `environment2` | A deployed instance (see README's "Deploying to Render") |

**1 server group.** Base-URL templates and override points (`options.Server.…`):

| Group | `Production` base URL | `Environment2` base URL | Override point |
| --- | --- | --- | --- |
| `Default` | `http://localhost:3000` | `https://{host}` | `options.Server.Default.Production.BaseUrl` (and the other environments) |

`Default` · `Environment2` template variables: `{host}` defaults to `"your-api-host.onrender.com"` — override `options.Server.Default.Environment2.Host`.

Retry/resilience is configurable via `options.Retry` (`RetryOptions`, backed by Polly).

