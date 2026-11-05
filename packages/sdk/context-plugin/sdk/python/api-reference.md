# Reference

**Parsed** endpoints return the typed payload and raise `ApiError` on a documented non-2xx. For the raw endpoints, see [Raw API Reference](raw-api-reference.md).

> Source: [RingfenceApiClient](ringfence_api/client.py)

## Events

> Source: [Events](ringfence_api/apis/events.py)

<details>
<summary><code>def get_at_risk_accounts(*, request_options: RequestOptionsOrDict | None = None) -> AtRiskResult</code></summary>

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

**Sync**

```python
try:
    response = client.events.get_at_risk_accounts()
    # TODO: Handle 'response' of type AtRiskResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetAtRiskAccountsErrorBody
```

**Async**

```python
try:
    response = await async_client.events.get_at_risk_accounts()
    # TODO: Handle 'response' of type AtRiskResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetAtRiskAccountsErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AtRiskResult](ringfence_api/models/at_risk_result.py)</code> -- OK

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[GetAtRiskAccountsErrorBody](ringfence_api/errors/get_at_risk_accounts_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def record_event(body: SignupEvent | SignupEventDict, *, request_options: RequestOptionsOrDict | None = None) -> Acknowledged</code></summary>

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

**Sync**

```python
try:
    response = client.events.record_event(SignupEvent(account_id="some example string"))
    # TODO: Handle 'response' of type Acknowledged
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RecordEventErrorBody
```

**Async**

```python
try:
    response = await async_client.events.record_event(SignupEvent(account_id="some example string"))
    # TODO: Handle 'response' of type Acknowledged
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RecordEventErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[SignupEvent](ringfence_api/models/signup_event.py) \| [SignupEventDict](ringfence_api/models/signup_event.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Acknowledged](ringfence_api/models/acknowledged.py)</code> -- Recorded.

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[RecordEventErrorBody](ringfence_api/errors/record_event_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## Holds

> Source: [Holds](ringfence_api/apis/holds.py)

<details>
<summary><code>def confirm_ring(id_: str, body: ConfirmRingRequest | ConfirmRingRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ConfirmRingResponse</code></summary>

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

**Sync**

```python
try:
    response = client.holds.confirm_ring("some example string", ConfirmRingRequest(run_id="some example string"))
    # TODO: Handle 'response' of type ConfirmRingResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ConfirmRingErrorBody
```

**Async**

```python
try:
    response = await async_client.holds.confirm_ring(
        "some example string", ConfirmRingRequest(run_id="some example string")
    )
    # TODO: Handle 'response' of type ConfirmRingResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ConfirmRingErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>str</code> | A ring id (e.g. `R-01`), or any other hold group id (e.g. a learned rule's `R-07`, or a pair's `P-01`) |
| <code>body</code> | <code>[ConfirmRingRequest](ringfence_api/models/confirm_ring_request.py) \| [ConfirmRingRequestDict](ringfence_api/models/confirm_ring_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ConfirmRingResponse](ringfence_api/models/confirm_ring_response.py)</code> -- OK

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[ConfirmRingErrorBody](ringfence_api/errors/confirm_ring_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 404 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def explain_ring(id_: str, run_id: str, *, request_options: RequestOptionsOrDict | None = None) -> RingExplanation</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Send a `GET` request.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.holds.explain_ring("some example string", "some example string")
    # TODO: Handle 'response' of type RingExplanation
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ExplainRingErrorBody
```

**Async**

```python
try:
    response = await async_client.holds.explain_ring("some example string", "some example string")
    # TODO: Handle 'response' of type RingExplanation
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ExplainRingErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>str</code> | A ring id (e.g. `R-01`), or any other hold group id (e.g. a learned rule's `R-07`, or a pair's `P-01`) |
| <code>run_id</code> | <code>str</code> | Value sent with the request. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[RingExplanation](ringfence_api/models/ring_explanation.py)</code> -- OK

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[ExplainRingErrorBody](ringfence_api/errors/explain_ring_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 404 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def release_holds(body: ReleaseRequest | ReleaseRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ReleaseResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Send a `POST` request.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.holds.release_holds(ReleaseRequest(run_id="some example string"))
    # TODO: Handle 'response' of type ReleaseResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ReleaseHoldsErrorBody
```

**Async**

```python
try:
    response = await async_client.holds.release_holds(ReleaseRequest(run_id="some example string"))
    # TODO: Handle 'response' of type ReleaseResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ReleaseHoldsErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[ReleaseRequest](ringfence_api/models/release_request.py) \| [ReleaseRequestDict](ringfence_api/models/release_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ReleaseResponse](ringfence_api/models/release_response.py)</code> -- This release was already recorded; its batch is returned unchanged.

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[ReleaseHoldsErrorBody](ringfence_api/errors/release_holds_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 409 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## Rules

> Source: [Rules](ringfence_api/apis/rules.py)

<details>
<summary><code>def approve_rule(id_: str, body: ApproveRuleRequest | ApproveRuleRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> StoredRule</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Send a `POST` request.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.rules.approve_rule("some example string", ApproveRuleRequest(approved_by="some example string"))
    # TODO: Handle 'response' of type StoredRule
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ApproveRuleErrorBody
```

**Async**

```python
try:
    response = await async_client.rules.approve_rule(
        "some example string", ApproveRuleRequest(approved_by="some example string")
    )
    # TODO: Handle 'response' of type StoredRule
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ApproveRuleErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>str</code> | A rule id, e.g. `R-07` |
| <code>body</code> | <code>[ApproveRuleRequest](ringfence_api/models/approve_rule_request.py) \| [ApproveRuleRequestDict](ringfence_api/models/approve_rule_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[StoredRule](ringfence_api/models/stored_rule.py)</code> -- Approved (or already was).

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[ApproveRuleErrorBody](ringfence_api/errors/approve_rule_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 404, 409 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_rules(*, request_options: RequestOptionsOrDict | None = None) -> list[StoredRule]</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Send a `GET` request.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.rules.list_rules()
    # TODO: Handle 'response' of type list[StoredRule]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListRulesErrorBody
```

**Async**

```python
try:
    response = await async_client.rules.list_rules()
    # TODO: Handle 'response' of type list[StoredRule]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListRulesErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>list&#91;[StoredRule](ringfence_api/models/stored_rule.py)&#93;</code> -- OK

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[ListRulesErrorBody](ringfence_api/errors/list_rules_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def propose_rule(body: ProposeRuleRequest | ProposeRuleRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> StoredRule</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Send a `POST` request.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.rules.propose_rule(
        ProposeRuleRequest(
            rule=Rule(id="some example string", action=Action.HOLD, when=RuleWhen(all=[RuleCondition()]))
        ),
    )
    # TODO: Handle 'response' of type StoredRule
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ProposeRuleErrorBody
```

**Async**

```python
try:
    response = await async_client.rules.propose_rule(
        ProposeRuleRequest(
            rule=Rule(id="some example string", action=Action.HOLD, when=RuleWhen(all=[RuleCondition()]))
        ),
    )
    # TODO: Handle 'response' of type StoredRule
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ProposeRuleErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[ProposeRuleRequest](ringfence_api/models/propose_rule_request.py) \| [ProposeRuleRequestDict](ringfence_api/models/propose_rule_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[StoredRule](ringfence_api/models/stored_rule.py)</code> -- Proposed. `flags` is non-empty when it needs a deliberate second look before approval.

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[ProposeRuleErrorBody](ringfence_api/errors/propose_rule_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## Runs

> Source: [Runs](ringfence_api/apis/runs.py)

<details>
<summary><code>def get_payout_run(id_: str, *, request_options: RequestOptionsOrDict | None = None) -> RunResponse</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Send a `GET` request.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.runs.get_payout_run("some example string")
    # TODO: Handle 'response' of type RunResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPayoutRunErrorBody
```

**Async**

```python
try:
    response = await async_client.runs.get_payout_run("some example string")
    # TODO: Handle 'response' of type RunResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetPayoutRunErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>str</code> | A run's `sender_batch_id` |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[RunResponse](ringfence_api/models/run_response.py)</code> -- OK

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[GetPayoutRunErrorBody](ringfence_api/errors/get_payout_run_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 401, 404 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def import_payout_run(body: ImportRunRequest | ImportRunRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> RunResponse</code></summary>

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

**Sync**

```python
try:
    response = client.runs.import_payout_run(
        ImportRunRequest(
            sender_batch_header=SenderBatchHeader(sender_batch_id="some example string"),
            items=[
                PayoutItemRequest(
                    receiver="user@example.com",
                    amount=Money(value="some example string", currency="some example string"),
                    sender_item_id="some example string",
                ),
            ],
            payout_batch_id="some example string",
        ),
    )
    # TODO: Handle 'response' of type RunResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ImportPayoutRunErrorBody
```

**Async**

```python
try:
    response = await async_client.runs.import_payout_run(
        ImportRunRequest(
            sender_batch_header=SenderBatchHeader(sender_batch_id="some example string"),
            items=[
                PayoutItemRequest(
                    receiver="user@example.com",
                    amount=Money(value="some example string", currency="some example string"),
                    sender_item_id="some example string",
                ),
            ],
            payout_batch_id="some example string",
        ),
    )
    # TODO: Handle 'response' of type RunResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ImportPayoutRunErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[ImportRunRequest](ringfence_api/models/import_run_request.py) \| [ImportRunRequestDict](ringfence_api/models/import_run_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[RunResponse](ringfence_api/models/run_response.py)</code> -- Already recorded.

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[ImportPayoutRunErrorBody](ringfence_api/errors/import_payout_run_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 409 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def screen_payees(body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ScreenResult</code></summary>

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

**Sync**

```python
try:
    response = client.runs.screen_payees(
        RunRequest(
            sender_batch_header=SenderBatchHeader(sender_batch_id="some example string"),
            items=[
                PayoutItemRequest(
                    receiver="user@example.com",
                    amount=Money(value="some example string", currency="some example string"),
                    sender_item_id="some example string",
                ),
            ],
        ),
    )
    # TODO: Handle 'response' of type ScreenResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ScreenPayeesErrorBody
```

**Async**

```python
try:
    response = await async_client.runs.screen_payees(
        RunRequest(
            sender_batch_header=SenderBatchHeader(sender_batch_id="some example string"),
            items=[
                PayoutItemRequest(
                    receiver="user@example.com",
                    amount=Money(value="some example string", currency="some example string"),
                    sender_item_id="some example string",
                ),
            ],
        ),
    )
    # TODO: Handle 'response' of type ScreenResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ScreenPayeesErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[RunRequest](ringfence_api/models/run_request.py) \| [RunRequestDict](ringfence_api/models/run_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ScreenResult](ringfence_api/models/screen_result.py)</code> -- OK

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[ScreenPayeesErrorBody](ringfence_api/errors/screen_payees_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def submit_payout_run(body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> RunResponse</code></summary>

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

**Sync**

```python
try:
    response = client.runs.submit_payout_run(
        RunRequest(
            sender_batch_header=SenderBatchHeader(sender_batch_id="some example string"),
            items=[
                PayoutItemRequest(
                    receiver="user@example.com",
                    amount=Money(value="some example string", currency="some example string"),
                    sender_item_id="some example string",
                ),
            ],
        ),
    )
    # TODO: Handle 'response' of type RunResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type SubmitPayoutRunErrorBody
```

**Async**

```python
try:
    response = await async_client.runs.submit_payout_run(
        RunRequest(
            sender_batch_header=SenderBatchHeader(sender_batch_id="some example string"),
            items=[
                PayoutItemRequest(
                    receiver="user@example.com",
                    amount=Money(value="some example string", currency="some example string"),
                    sender_item_id="some example string",
                ),
            ],
        ),
    )
    # TODO: Handle 'response' of type RunResponse
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type SubmitPayoutRunErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[RunRequest](ringfence_api/models/run_request.py) \| [RunRequestDict](ringfence_api/models/run_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[RunResponse](ringfence_api/models/run_response.py)</code> -- This run's `sender_batch_id` was already recorded; nothing new happened.

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[SubmitPayoutRunErrorBody](ringfence_api/errors/submit_payout_run_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 409 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## System

> Source: [System](ringfence_api/apis/system.py)

<details>
<summary><code>def health(*, request_options: RequestOptionsOrDict | None = None) -> HealthStatus</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Send a `GET` request.

</dd>
</dl>

### Usage

<dl>
<dd>

**Sync**

```python
try:
    response = client.system.health()
    # TODO: Handle 'response' of type HealthStatus
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

**Async**

```python
try:
    response = await async_client.system.health()
    # TODO: Handle 'response' of type HealthStatus
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[HealthStatus](ringfence_api/models/health_status.py)</code> -- OK

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[RawError](ringfence_api/core/results.py)&#93;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Webhooks

> Source: [Webhooks](ringfence_api/apis/webhooks.py)

<details>
<summary><code>def list_webhook_events(*, request_options: RequestOptionsOrDict | None = None) -> list[WebhookEventLogEntry]</code></summary>

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

**Sync**

```python
try:
    response = client.webhooks.list_webhook_events()
    # TODO: Handle 'response' of type list[WebhookEventLogEntry]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListWebhookEventsErrorBody
```

**Async**

```python
try:
    response = await async_client.webhooks.list_webhook_events()
    # TODO: Handle 'response' of type list[WebhookEventLogEntry]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ListWebhookEventsErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>list&#91;[WebhookEventLogEntry](ringfence_api/models/webhook_event_log_entry.py)&#93;</code> -- OK

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[ListWebhookEventsErrorBody](ringfence_api/errors/list_webhook_events_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 404 | <code>[Error](ringfence_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def receive_paypal_webhook(body: Any, *, request_options: RequestOptionsOrDict | None = None) -> WebhookAck</code></summary>

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

**Sync**

```python
try:
    response = client.webhooks.receive_paypal_webhook({})
    # TODO: Handle 'response' of type WebhookAck
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ReceivePaypalWebhookErrorBody
```

**Async**

```python
try:
    response = await async_client.webhooks.receive_paypal_webhook({})
    # TODO: Handle 'response' of type WebhookAck
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type ReceivePaypalWebhookErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>Any</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](ringfence_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[WebhookAck](ringfence_api/models/webhook_ack.py)</code> -- Verified (applied, or a recognized redelivery).

**OnError**: <code>[ApiError](ringfence_api/core/exceptions.py)&#91;[ReceivePaypalWebhookErrorBody](ringfence_api/errors/receive_paypal_webhook_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400 | <code>[WebhookRejected](ringfence_api/models/webhook_rejected.py)</code> |
| anything unmapped | <code>[RawError](ringfence_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

