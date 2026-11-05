# Reference

Every operation below is shown in its throwing form. On an error status it throws `ApiException<TError>` — the status code, headers, content type and the operation's error type, `RawError` (the raw body) when the spec declares none — and where an operation offers an `…AsResult` sibling, that sibling returns `ApiResult<TResponse, TError>` instead. A request that produces no usable response surfaces as `SdkConnectionException` or `SdkTimeoutException`, a body that does not match the documented response type as `ResponseDeserializationException`, and a required credential that is not configured, or one that cannot be applied, as `AuthSchemeException`; all of them derive from `SdkException` and name the failed call. See [README → Error Handling](README.md#error-handling).

> Source: [RingfenceApiClient](src/RingfenceApi/RingfenceApiClient.cs)

## Events

> Source: [Events](src/RingfenceApi/Api/Events.cs)

<details>
<summary><code>Task&lt;AtRiskResult&gt; GetAtRiskAccounts(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Only `disposable_email` and the graph's own link signals (shared device/address, alias pattern, IP neighborhood) can fire pre-payday — timing-based risk flags need data that isn't known until closer to payday.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Events.GetAtRiskAccounts();
    // TODO: Handle 'response' of type AtRiskResult
}
catch (ApiException<GetAtRiskAccountsError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AtRiskResult](src/RingfenceApi/Models/AtRiskResult.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[GetAtRiskAccountsError](src/RingfenceApi/Errors/GetAtRiskAccountsError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;Acknowledged&gt; RecordEvent(RecordEventRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Merges into whatever this `account_id` already has rather than replacing it — a referral touch can arrive before the account's payout email is known. IP prefixes are hashed before storage, the same privacy guarantee a real run gets.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Events.RecordEvent(new RecordEventRequest
    {
        Body = new SignupEvent { AccountId = "some example string" },
    });
    // TODO: Handle 'response' of type Acknowledged
}
catch (ApiException<RecordEventError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[RecordEventRequest](src/RingfenceApi/Requests/Events/RecordEventRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Acknowledged](src/RingfenceApi/Models/Acknowledged.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[RecordEventError](src/RingfenceApi/Errors/RecordEventError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Holds

> Source: [Holds](src/RingfenceApi/Api/Holds.cs)

<details>
<summary><code>Task&lt;ConfirmRingResponse&gt; ConfirmRing(ConfirmRingOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

The ring's devices and payout addresses also join this deployment's ring network as one-way keyed hashes (FR-19), so another program can hold — never block — a repeat on first sight, without ever seeing this program's raw data.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Holds.ConfirmRing(new ConfirmRingOperationRequest
    {
        Id = "some example string",
        Body = new ConfirmRingRequest { RunId = "some example string" },
    });
    // TODO: Handle 'response' of type ConfirmRingResponse
}
catch (ApiException<ConfirmRingError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[ConfirmRingOperationRequest](src/RingfenceApi/Requests/Holds/ConfirmRingOperationRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ConfirmRingResponse](src/RingfenceApi/Models/ConfirmRingResponse.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[ConfirmRingError](src/RingfenceApi/Errors/ConfirmRingError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;RingExplanation&gt; ExplainRing(ExplainRingRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Holds.ExplainRing(new ExplainRingRequest
    {
        Id = "some example string",
        RunId = "some example string",
    });
    // TODO: Handle 'response' of type RingExplanation
}
catch (ApiException<ExplainRingError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[ExplainRingRequest](src/RingfenceApi/Requests/Holds/ExplainRingRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[RingExplanation](src/RingfenceApi/Models/RingExplanation.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[ExplainRingError](src/RingfenceApi/Errors/ExplainRingError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;ReleaseResponse&gt; ReleaseHolds(ReleaseHoldsRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Holds.ReleaseHolds(new ReleaseHoldsRequest
    {
        Body = new ReleaseRequest { RunId = "some example string" },
    });
    // TODO: Handle 'response' of type ReleaseResponse
}
catch (ApiException<ReleaseHoldsError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[ReleaseHoldsRequest](src/RingfenceApi/Requests/Holds/ReleaseHoldsRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ReleaseResponse](src/RingfenceApi/Models/ReleaseResponse.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[ReleaseHoldsError](src/RingfenceApi/Errors/ReleaseHoldsError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Rules

> Source: [Rules](src/RingfenceApi/Api/Rules.cs)

<details>
<summary><code>Task&lt;StoredRule&gt; ApproveRule(ApproveRuleOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Rules.ApproveRule(new ApproveRuleOperationRequest
    {
        Id = "some example string",
        Body = new ApproveRuleRequest { ApprovedBy = "some example string" },
    });
    // TODO: Handle 'response' of type StoredRule
}
catch (ApiException<ApproveRuleError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[ApproveRuleOperationRequest](src/RingfenceApi/Requests/Rules/ApproveRuleOperationRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[StoredRule](src/RingfenceApi/Models/StoredRule.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[ApproveRuleError](src/RingfenceApi/Errors/ApproveRuleError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;IReadOnlyList&lt;StoredRule&gt;&gt; ListRules(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Rules.ListRules();
    // TODO: Handle 'response' of type IReadOnlyList<StoredRule>
}
catch (ApiException<ListRulesError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>IReadOnlyList&lt;[StoredRule](src/RingfenceApi/Models/StoredRule.cs)&gt;</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[ListRulesError](src/RingfenceApi/Errors/ListRulesError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;StoredRule&gt; ProposeRule(ProposeRuleOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Rules.ProposeRule(new ProposeRuleOperationRequest
    {
        Body = new ProposeRuleRequest
        {
            Rule = new Rule
            {
                Id = "some example string",
                Action = ActionEnum.Hold,
                When = new RuleWhen { All = [new RuleCondition { Signal = signal }] },
            },
        },
    });
    // TODO: Handle 'response' of type StoredRule
}
catch (ApiException<ProposeRuleError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[ProposeRuleOperationRequest](src/RingfenceApi/Requests/Rules/ProposeRuleOperationRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[StoredRule](src/RingfenceApi/Models/StoredRule.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[ProposeRuleError](src/RingfenceApi/Errors/ProposeRuleError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Runs

> Source: [Runs](src/RingfenceApi/Api/Runs.cs)

<details>
<summary><code>Task&lt;RunResponse&gt; GetPayoutRun(GetPayoutRunRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Runs.GetPayoutRun(new GetPayoutRunRequest { Id = "some example string" });
    // TODO: Handle 'response' of type RunResponse
}
catch (ApiException<GetPayoutRunError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[GetPayoutRunRequest](src/RingfenceApi/Requests/Runs/GetPayoutRunRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[RunResponse](src/RingfenceApi/Models/RunResponse.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[GetPayoutRunError](src/RingfenceApi/Errors/GetPayoutRunError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;RunResponse&gt; ImportPayoutRun(ImportPayoutRunRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Nothing is decided and nothing is sent; every item is recorded as already `sent`.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Runs.ImportPayoutRun(new ImportPayoutRunRequest
    {
        Body = new ImportRunRequest
        {
            SenderBatchHeader = new SenderBatchHeader { SenderBatchId = "some example string" },
            Items = [
                new PayoutItemRequest
                {
                    Receiver = "user@example.com",
                    Amount = new Money { Value = "some example string", Currency = "some example string" },
                    SenderItemId = "some example string",
                },
            ],
            PayoutBatchId = "some example string",
        },
    });
    // TODO: Handle 'response' of type RunResponse
}
catch (ApiException<ImportPayoutRunError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[ImportPayoutRunRequest](src/RingfenceApi/Requests/Runs/ImportPayoutRunRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[RunResponse](src/RingfenceApi/Models/RunResponse.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[ImportPayoutRunError](src/RingfenceApi/Errors/ImportPayoutRunError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;ScreenResult&gt; ScreenPayees(ScreenPayeesRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

The same decision function `POST /v1/payout-runs` uses, so an AI agent that screens a list before paying it can't disagree with the real API. Available to the read-only MCP key as well as the full key.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Runs.ScreenPayees(new ScreenPayeesRequest
    {
        Body = new RunRequest
        {
            SenderBatchHeader = new SenderBatchHeader { SenderBatchId = "some example string" },
            Items = [
                new PayoutItemRequest
                {
                    Receiver = "user@example.com",
                    Amount = new Money { Value = "some example string", Currency = "some example string" },
                    SenderItemId = "some example string",
                },
            ],
        },
    });
    // TODO: Handle 'response' of type ScreenResult
}
catch (ApiException<ScreenPayeesError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[ScreenPayeesRequest](src/RingfenceApi/Requests/Runs/ScreenPayeesRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ScreenResult](src/RingfenceApi/Models/ScreenResult.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[ScreenPayeesError](src/RingfenceApi/Errors/ScreenPayeesError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;RunResponse&gt; SubmitPayoutRun(SubmitPayoutRunRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Resending a run with the same `sender_batch_id` is a no-op: it returns what was decided the first time without deciding or sending anything again.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Runs.SubmitPayoutRun(new SubmitPayoutRunRequest
    {
        Body = new RunRequest
        {
            SenderBatchHeader = new SenderBatchHeader { SenderBatchId = "some example string" },
            Items = [
                new PayoutItemRequest
                {
                    Receiver = "user@example.com",
                    Amount = new Money { Value = "some example string", Currency = "some example string" },
                    SenderItemId = "some example string",
                },
            ],
        },
    });
    // TODO: Handle 'response' of type RunResponse
}
catch (ApiException<SubmitPayoutRunError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[SubmitPayoutRunRequest](src/RingfenceApi/Requests/Runs/SubmitPayoutRunRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[RunResponse](src/RingfenceApi/Models/RunResponse.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[SubmitPayoutRunError](src/RingfenceApi/Errors/SubmitPayoutRunError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## SystemApi

> Source: [SystemApi](src/RingfenceApi/Api/SystemApi.cs)

<details>
<summary><code>Task&lt;HealthStatus&gt; Health(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.SystemApi.Health();
    // TODO: Handle 'response' of type HealthStatus
}
catch (ApiException<RawError> ex)
{
    // TODO: Handle 'ex.Error' of type RawError
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[HealthStatus](src/RingfenceApi/Models/HealthStatus.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[RawError](src/RingfenceApi/Core/ErrorResponse/RawError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## WebhooksApi

> Source: [WebhooksApi](src/RingfenceApi/Api/WebhooksApi.cs)

<details>
<summary><code>Task&lt;IReadOnlyList&lt;WebhookEventLogEntry&gt;&gt; ListWebhookEvents(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Guarded by a separate admin bearer token (`ADMIN_TOKEN`), not a program's API key. Answers 404 if no admin token is configured.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.WebhooksApi.ListWebhookEvents();
    // TODO: Handle 'response' of type IReadOnlyList<WebhookEventLogEntry>
}
catch (ApiException<ListWebhookEventsError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>IReadOnlyList&lt;[WebhookEventLogEntry](src/RingfenceApi/Models/WebhookEventLogEntry.cs)&gt;</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[ListWebhookEventsError](src/RingfenceApi/Errors/ListWebhookEventsError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;WebhookAck&gt; ReceivePaypalWebhook(ReceivePaypalWebhookRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

No API key — PayPal's own signature on the request is the authentication.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.WebhooksApi.ReceivePaypalWebhook(new ReceivePaypalWebhookRequest { Body = body });
    // TODO: Handle 'response' of type WebhookAck
}
catch (ApiException<ReceivePaypalWebhookError> ex)
{
    if (ex.Error.TryGetWebhookRejected(out var error))
    {
        // TODO: Handle 'error' of type WebhookRejected
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[ReceivePaypalWebhookRequest](src/RingfenceApi/Requests/WebhooksApi/ReceivePaypalWebhookRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[WebhookAck](src/RingfenceApi/Models/WebhookAck.cs)</code>

**OnError**: <code>[ApiException](src/RingfenceApi/Core/Exceptions/ApiException.cs)&lt;[ReceivePaypalWebhookError](src/RingfenceApi/Errors/ReceivePaypalWebhookError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

