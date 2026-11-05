from __future__ import annotations

from uuid import UUID, uuid4

from ..auth import AsyncAuthSchemes, AuthSchemes
from ..core import (
    ApiResult,
    AsyncRawClient,
    RawClient,
    RequestOptionsOrDict,
    SecuredRawResponse,
    async_json_decoder,
    json_body,
    json_decoder,
    param,
    unwrap,
)
from ..errors.get_at_risk_accounts_error import GetAtRiskAccountsErrorBody, get_at_risk_accounts_error_mapper
from ..errors.record_event_error import RecordEventErrorBody, record_event_error_mapper
from ..models.acknowledged import Acknowledged
from ..models.at_risk_result import AtRiskResult
from ..models.signup_event import SignupEvent, SignupEventDict
from ..server.server import Server


class Events:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = EventsWithRawResponse(client, server, auth)

    def get_at_risk_accounts(self, *, request_options: RequestOptionsOrDict | None = None) -> AtRiskResult:
        """Only ``disposable_email`` and the graph's own link signals (shared device/address, alias pattern, IP
        neighborhood) can fire pre-payday — timing-based risk flags need data that isn't known until closer to payday.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Missing or unknown API key ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.get_at_risk_accounts(request_options=request_options))

    def record_event(
        self, body: SignupEvent | SignupEventDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> Acknowledged:
        """Merges into whatever this ``account_id`` already has rather than replacing it — a referral touch can arrive
        before the account's payout email is known. IP prefixes are hashed before storage, the same privacy guarantee a
        real run gets.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Recorded.

        Raises:
            ApiError: Failed request validation Missing or unknown API key ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.record_event(body, request_options=request_options))

    @property
    def with_raw_response(self) -> EventsWithRawResponse:
        return self._with_raw_response


class AsyncEvents:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncEventsWithRawResponse(client, server, auth)

    async def get_at_risk_accounts(self, *, request_options: RequestOptionsOrDict | None = None) -> AtRiskResult:
        """Only ``disposable_email`` and the graph's own link signals (shared device/address, alias pattern, IP
        neighborhood) can fire pre-payday — timing-based risk flags need data that isn't known until closer to payday.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Missing or unknown API key ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.get_at_risk_accounts(request_options=request_options))

    async def record_event(
        self, body: SignupEvent | SignupEventDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> Acknowledged:
        """Merges into whatever this ``account_id`` already has rather than replacing it — a referral touch can arrive
        before the account's payout email is known. IP prefixes are hashed before storage, the same privacy guarantee a
        real run gets.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Recorded.

        Raises:
            ApiError: Failed request validation Missing or unknown API key ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.record_event(body, request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncEventsWithRawResponse:
        return self._with_raw_response


class EventsWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def get_at_risk_accounts(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AtRiskResult, GetAtRiskAccountsErrorBody]:
        """Only ``disposable_email`` and the graph's own link signals (shared device/address, alias pattern, IP
        neighborhood) can fire pre-payday — timing-based risk flags need data that isn't known until closer to payday.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/v1/events/at-risk"),
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[AtRiskResult],
            error_mapper=get_at_risk_accounts_error_mapper,
            request_options=request_options,
        )

    def record_event(
        self, body: SignupEvent | SignupEventDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[Acknowledged, RecordEventErrorBody]:
        """Merges into whatever this ``account_id`` already has rather than replacing it — a referral touch can arrive
        before the account's payout email is known. IP prefixes are hashed before storage, the same privacy guarantee a
        real run gets.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/events"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[SignupEvent | SignupEventDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[Acknowledged],
            error_mapper=record_event_error_mapper,
            request_options=request_options,
        )


class AsyncEventsWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def get_at_risk_accounts(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AtRiskResult, GetAtRiskAccountsErrorBody]:
        """Only ``disposable_email`` and the graph's own link signals (shared device/address, alias pattern, IP
        neighborhood) can fire pre-payday — timing-based risk flags need data that isn't known until closer to payday.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/v1/events/at-risk"),
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[AtRiskResult],
            error_mapper=get_at_risk_accounts_error_mapper,
            request_options=request_options,
        )

    async def record_event(
        self, body: SignupEvent | SignupEventDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[Acknowledged, RecordEventErrorBody]:
        """Merges into whatever this ``account_id`` already has rather than replacing it — a referral touch can arrive
        before the account's payout email is known. IP prefixes are hashed before storage, the same privacy guarantee a
        real run gets.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/events"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[SignupEvent | SignupEventDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[Acknowledged],
            error_mapper=record_event_error_mapper,
            request_options=request_options,
        )
