# Reference

> Source: [RingfenceApiClient](src/client.ts)

## Runs

> Source: [Runs](src/resources/runs.ts)

<details>
<summary><code>getPayoutRun(request: Runs.GetPayoutRunRequest, options?: RequestOptions): ApiPromise&lt;RunResponse, Runs.GetPayoutRunError&gt;</code></summary>

<dl>
<dd>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.runs.getPayoutRun({ id: "some example string" });
  // TODO: Handle 'response' of type RunResponse
} catch (err) {
  // TODO: Handle 'err' of type Runs.GetPayoutRunError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.runs.getPayoutRun({ id: "some example string" }).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type RunResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | A run's `sender_batch_id` |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.runs.getPayoutRun(request)`

- **OnSuccess**: <code>[RunResponse](src/models/run-response.ts)</code>
- **OnError**: throws <code>[Runs.GetPayoutRunError](src/resources/runs.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.runs.getPayoutRun(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;RunResponse, Runs.GetPayoutRunError&gt;</code>, with `result.value` of type <code>[RunResponse](src/models/run-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>importPayoutRun(request: Runs.ImportPayoutRunRequest, options?: RequestOptions): ApiPromise&lt;RunResponse, Runs.ImportPayoutRunError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Nothing is decided and nothing is sent; every item is recorded as already `sent`.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.runs.importPayoutRun({
    body: {
      senderBatchHeader: { senderBatchId: "some example string" },
      items: [
        {
          receiver: "user@example.com",
          amount: { value: "some example string", currency: "some example string" },
          senderItemId: "some example string",
        },
      ],
      payoutBatchId: "some example string",
    },
  });
  // TODO: Handle 'response' of type RunResponse
} catch (err) {
  // TODO: Handle 'err' of type Runs.ImportPayoutRunError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.runs.importPayoutRun({
  body: {
    senderBatchHeader: { senderBatchId: "some example string" },
    items: [
      {
        receiver: "user@example.com",
        amount: { value: "some example string", currency: "some example string" },
        senderItemId: "some example string",
      },
    ],
    payoutBatchId: "some example string",
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type RunResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[ImportRunRequest](src/models/import-run-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.runs.importPayoutRun(request)`

- **OnSuccess**: <code>[RunResponse](src/models/run-response.ts)</code>
- **OnError**: throws <code>[Runs.ImportPayoutRunError](src/resources/runs.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.runs.importPayoutRun(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;RunResponse, Runs.ImportPayoutRunError&gt;</code>, with `result.value` of type <code>[RunResponse](src/models/run-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>screenPayees(request: Runs.ScreenPayeesRequest, options?: RequestOptions): ApiPromise&lt;ScreenResult, Runs.ScreenPayeesError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

The same decision function `POST /v1/payout-runs` uses, so an AI agent that screens a list before paying it can't disagree with the real API. Available to the read-only MCP key as well as the full key.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.runs.screenPayees({
    body: {
      senderBatchHeader: { senderBatchId: "some example string" },
      items: [
        {
          receiver: "user@example.com",
          amount: { value: "some example string", currency: "some example string" },
          senderItemId: "some example string",
        },
      ],
    },
  });
  // TODO: Handle 'response' of type ScreenResult
} catch (err) {
  // TODO: Handle 'err' of type Runs.ScreenPayeesError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.runs.screenPayees({
  body: {
    senderBatchHeader: { senderBatchId: "some example string" },
    items: [
      {
        receiver: "user@example.com",
        amount: { value: "some example string", currency: "some example string" },
        senderItemId: "some example string",
      },
    ],
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ScreenResult
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[RunRequest](src/models/run-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.runs.screenPayees(request)`

- **OnSuccess**: <code>[ScreenResult](src/models/screen-result.ts)</code>
- **OnError**: throws <code>[Runs.ScreenPayeesError](src/resources/runs.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.runs.screenPayees(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ScreenResult, Runs.ScreenPayeesError&gt;</code>, with `result.value` of type <code>[ScreenResult](src/models/screen-result.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>submitPayoutRun(request: Runs.SubmitPayoutRunRequest, options?: RequestOptions): ApiPromise&lt;RunResponse, Runs.SubmitPayoutRunError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Resending a run with the same `sender_batch_id` is a no-op: it returns what was decided the first time without deciding or sending anything again.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.runs.submitPayoutRun({
    body: {
      senderBatchHeader: { senderBatchId: "some example string" },
      items: [
        {
          receiver: "user@example.com",
          amount: { value: "some example string", currency: "some example string" },
          senderItemId: "some example string",
        },
      ],
    },
  });
  // TODO: Handle 'response' of type RunResponse
} catch (err) {
  // TODO: Handle 'err' of type Runs.SubmitPayoutRunError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.runs.submitPayoutRun({
  body: {
    senderBatchHeader: { senderBatchId: "some example string" },
    items: [
      {
        receiver: "user@example.com",
        amount: { value: "some example string", currency: "some example string" },
        senderItemId: "some example string",
      },
    ],
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type RunResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[RunRequest](src/models/run-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.runs.submitPayoutRun(request)`

- **OnSuccess**: <code>[RunResponse](src/models/run-response.ts)</code>
- **OnError**: throws <code>[Runs.SubmitPayoutRunError](src/resources/runs.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.runs.submitPayoutRun(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;RunResponse, Runs.SubmitPayoutRunError&gt;</code>, with `result.value` of type <code>[RunResponse](src/models/run-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Holds

> Source: [Holds](src/resources/holds.ts)

<details>
<summary><code>confirmRing(request: Holds.ConfirmRingRequestParams, options?: RequestOptions): ApiPromise&lt;ConfirmRingResponse, Holds.ConfirmRingError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

The ring's devices and payout addresses also join this deployment's ring network as one-way keyed hashes (FR-19), so another program can hold — never block — a repeat on first sight, without ever seeing this program's raw data.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.holds.confirmRing({
    id: "some example string",
    body: { runId: "some example string" },
  });
  // TODO: Handle 'response' of type ConfirmRingResponse
} catch (err) {
  // TODO: Handle 'err' of type Holds.ConfirmRingError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.holds.confirmRing({
  id: "some example string",
  body: { runId: "some example string" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ConfirmRingResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | A ring id (e.g. `R-01`), or any other hold group id (e.g. a learned rule's `R-07`, or a pair's `P-01`) |
| <code>body</code> | <code>[ConfirmRingRequest](src/models/confirm-ring-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.holds.confirmRing(request)`

- **OnSuccess**: <code>[ConfirmRingResponse](src/models/confirm-ring-response.ts)</code>
- **OnError**: throws <code>[Holds.ConfirmRingError](src/resources/holds.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.holds.confirmRing(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ConfirmRingResponse, Holds.ConfirmRingError&gt;</code>, with `result.value` of type <code>[ConfirmRingResponse](src/models/confirm-ring-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>explainRing(request: Holds.ExplainRingRequest, options?: RequestOptions): ApiPromise&lt;RingExplanation, Holds.ExplainRingError&gt;</code></summary>

<dl>
<dd>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.holds.explainRing({
    id: "some example string",
    runId: "some example string",
  });
  // TODO: Handle 'response' of type RingExplanation
} catch (err) {
  // TODO: Handle 'err' of type Holds.ExplainRingError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.holds.explainRing({
  id: "some example string",
  runId: "some example string",
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type RingExplanation
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | A ring id (e.g. `R-01`), or any other hold group id (e.g. a learned rule's `R-07`, or a pair's `P-01`) |
| <code>runId</code> | <code>string</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.holds.explainRing(request)`

- **OnSuccess**: <code>[RingExplanation](src/models/ring-explanation.ts)</code>
- **OnError**: throws <code>[Holds.ExplainRingError](src/resources/holds.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.holds.explainRing(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;RingExplanation, Holds.ExplainRingError&gt;</code>, with `result.value` of type <code>[RingExplanation](src/models/ring-explanation.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>releaseHolds(request: Holds.ReleaseHoldsRequest, options?: RequestOptions): ApiPromise&lt;ReleaseResponse, Holds.ReleaseHoldsError&gt;</code></summary>

<dl>
<dd>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.holds.releaseHolds({ body: { runId: "some example string" } });
  // TODO: Handle 'response' of type ReleaseResponse
} catch (err) {
  // TODO: Handle 'err' of type Holds.ReleaseHoldsError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.holds.releaseHolds({ body: { runId: "some example string" } }).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ReleaseResponse
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[ReleaseRequest](src/models/release-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.holds.releaseHolds(request)`

- **OnSuccess**: <code>[ReleaseResponse](src/models/release-response.ts)</code>
- **OnError**: throws <code>[Holds.ReleaseHoldsError](src/resources/holds.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.holds.releaseHolds(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ReleaseResponse, Holds.ReleaseHoldsError&gt;</code>, with `result.value` of type <code>[ReleaseResponse](src/models/release-response.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Rules

> Source: [Rules](src/resources/rules.ts)

<details>
<summary><code>approveRule(request: Rules.ApproveRuleRequestParams, options?: RequestOptions): ApiPromise&lt;StoredRule, Rules.ApproveRuleError&gt;</code></summary>

<dl>
<dd>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.rules.approveRule({
    id: "some example string",
    body: { approvedBy: "some example string" },
  });
  // TODO: Handle 'response' of type StoredRule
} catch (err) {
  // TODO: Handle 'err' of type Rules.ApproveRuleError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.rules.approveRule({
  id: "some example string",
  body: { approvedBy: "some example string" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type StoredRule
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | A rule id, e.g. `R-07` |
| <code>body</code> | <code>[ApproveRuleRequest](src/models/approve-rule-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.rules.approveRule(request)`

- **OnSuccess**: <code>[StoredRule](src/models/stored-rule.ts)</code>
- **OnError**: throws <code>[Rules.ApproveRuleError](src/resources/rules.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.rules.approveRule(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;StoredRule, Rules.ApproveRuleError&gt;</code>, with `result.value` of type <code>[StoredRule](src/models/stored-rule.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listRules(options?: RequestOptions): ApiPromise&lt;StoredRule[], Rules.ListRulesError&gt;</code></summary>

<dl>
<dd>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.rules.listRules();
  // TODO: Handle 'response' of type StoredRule[]
} catch (err) {
  // TODO: Handle 'err' of type Rules.ListRulesError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.rules.listRules().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type StoredRule[]
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.rules.listRules()`

- **OnSuccess**: <code>[StoredRule](src/models/stored-rule.ts)[]</code>
- **OnError**: throws <code>[Rules.ListRulesError](src/resources/rules.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.rules.listRules().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;StoredRule[], Rules.ListRulesError&gt;</code>, with `result.value` of type <code>[StoredRule](src/models/stored-rule.ts)[]</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>proposeRule(request: Rules.ProposeRuleRequestParams, options?: RequestOptions): ApiPromise&lt;StoredRule, Rules.ProposeRuleError&gt;</code></summary>

<dl>
<dd>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.rules.proposeRule({
    body: { rule: { id: "some example string", action: Action.Hold, when: { all: [{}] } } },
  });
  // TODO: Handle 'response' of type StoredRule
} catch (err) {
  // TODO: Handle 'err' of type Rules.ProposeRuleError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.rules.proposeRule({
  body: { rule: { id: "some example string", action: Action.Hold, when: { all: [{}] } } },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type StoredRule
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[ProposeRuleRequest](src/models/propose-rule-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.rules.proposeRule(request)`

- **OnSuccess**: <code>[StoredRule](src/models/stored-rule.ts)</code>
- **OnError**: throws <code>[Rules.ProposeRuleError](src/resources/rules.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.rules.proposeRule(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;StoredRule, Rules.ProposeRuleError&gt;</code>, with `result.value` of type <code>[StoredRule](src/models/stored-rule.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Events

> Source: [Events](src/resources/events.ts)

<details>
<summary><code>getAtRiskAccounts(options?: RequestOptions): ApiPromise&lt;AtRiskResult, Events.GetAtRiskAccountsError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Only `disposable_email` and the graph's own link signals (shared device/address, alias pattern, IP neighborhood) can fire pre-payday — timing-based risk flags need data that isn't known until closer to payday.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.events.getAtRiskAccounts();
  // TODO: Handle 'response' of type AtRiskResult
} catch (err) {
  // TODO: Handle 'err' of type Events.GetAtRiskAccountsError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.events.getAtRiskAccounts().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type AtRiskResult
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.events.getAtRiskAccounts()`

- **OnSuccess**: <code>[AtRiskResult](src/models/at-risk-result.ts)</code>
- **OnError**: throws <code>[Events.GetAtRiskAccountsError](src/resources/events.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.events.getAtRiskAccounts().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;AtRiskResult, Events.GetAtRiskAccountsError&gt;</code>, with `result.value` of type <code>[AtRiskResult](src/models/at-risk-result.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>recordEvent(request: Events.RecordEventRequest, options?: RequestOptions): ApiPromise&lt;Acknowledged, Events.RecordEventError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Merges into whatever this `account_id` already has rather than replacing it — a referral touch can arrive before the account's payout email is known. IP prefixes are hashed before storage, the same privacy guarantee a real run gets.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.events.recordEvent({ body: { accountId: "some example string" } });
  // TODO: Handle 'response' of type Acknowledged
} catch (err) {
  // TODO: Handle 'err' of type Events.RecordEventError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.events.recordEvent({ body: { accountId: "some example string" } }).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type Acknowledged
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[SignupEvent](src/models/signup-event.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.events.recordEvent(request)`

- **OnSuccess**: <code>[Acknowledged](src/models/acknowledged.ts)</code>
- **OnError**: throws <code>[Events.RecordEventError](src/resources/events.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.events.recordEvent(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;Acknowledged, Events.RecordEventError&gt;</code>, with `result.value` of type <code>[Acknowledged](src/models/acknowledged.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Webhooks

> Source: [Webhooks](src/resources/webhooks.ts)

<details>
<summary><code>listWebhookEvents(options?: RequestOptions): ApiPromise&lt;WebhookEventLogEntry[], Webhooks.ListWebhookEventsError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Guarded by a separate admin bearer token (`ADMIN_TOKEN`), not a program's API key. Answers 404 if no admin token is configured.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.webhooks.listWebhookEvents();
  // TODO: Handle 'response' of type WebhookEventLogEntry[]
} catch (err) {
  // TODO: Handle 'err' of type Webhooks.ListWebhookEventsError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.webhooks.listWebhookEvents().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type WebhookEventLogEntry[]
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.webhooks.listWebhookEvents()`

- **OnSuccess**: <code>[WebhookEventLogEntry](src/models/webhook-event-log-entry.ts)[]</code>
- **OnError**: throws <code>[Webhooks.ListWebhookEventsError](src/resources/webhooks.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.webhooks.listWebhookEvents().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;WebhookEventLogEntry[], Webhooks.ListWebhookEventsError&gt;</code>, with `result.value` of type <code>[WebhookEventLogEntry](src/models/webhook-event-log-entry.ts)[]</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>receivePaypalWebhook(request: Webhooks.ReceivePaypalWebhookRequest, options?: RequestOptions): ApiPromise&lt;WebhookAck, Webhooks.ReceivePaypalWebhookError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

No API key — PayPal's own signature on the request is the authentication.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.webhooks.receivePaypalWebhook({ body: {} });
  // TODO: Handle 'response' of type WebhookAck
} catch (err) {
  // TODO: Handle 'err' of type Webhooks.ReceivePaypalWebhookError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.webhooks.receivePaypalWebhook({ body: {} }).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type WebhookAck
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>Record&lt;string, unknown&gt;</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.webhooks.receivePaypalWebhook(request)`

- **OnSuccess**: <code>[WebhookAck](src/models/webhook-ack.ts)</code>
- **OnError**: throws <code>[Webhooks.ReceivePaypalWebhookError](src/resources/webhooks.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.webhooks.receivePaypalWebhook(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;WebhookAck, Webhooks.ReceivePaypalWebhookError&gt;</code>, with `result.value` of type <code>[WebhookAck](src/models/webhook-ack.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## System

> Source: [System](src/resources/system.ts)

<details>
<summary><code>health(options?: RequestOptions): ApiPromise&lt;HealthStatus, ApiError&gt;</code></summary>

<dl>
<dd>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.system.health();
  // TODO: Handle 'response' of type HealthStatus
} catch (err) {
  // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.system.health().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type HealthStatus
} else {
  // TODO: Handle 'result', where 'result.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.system.health()`

- **OnSuccess**: <code>[HealthStatus](src/models/health-status.ts)</code>
- **OnError**: throws <code>[ApiError](src/core/api-error.ts)</code>, with `err.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm

**As ApiResult**: `await client.system.health().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;HealthStatus, ApiError&gt;</code>, with `result.value` of type <code>[HealthStatus](src/models/health-status.ts)</code>
- **OnError**: `result.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm, with `result.message`

**Thrown**: <code>[RingfenceApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

