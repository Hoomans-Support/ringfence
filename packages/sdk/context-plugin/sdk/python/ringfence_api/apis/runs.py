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
from ..errors.get_payout_run_error import GetPayoutRunErrorBody, get_payout_run_error_mapper
from ..errors.import_payout_run_error import ImportPayoutRunErrorBody, import_payout_run_error_mapper
from ..errors.screen_payees_error import ScreenPayeesErrorBody, screen_payees_error_mapper
from ..errors.submit_payout_run_error import SubmitPayoutRunErrorBody, submit_payout_run_error_mapper
from ..models.import_run_request import ImportRunRequest, ImportRunRequestDict
from ..models.run_request import RunRequest, RunRequestDict
from ..models.run_response import RunResponse
from ..models.screen_result import ScreenResult
from ..server.server import Server


class Runs:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = RunsWithRawResponse(client, server, auth)

    def get_payout_run(self, id_: str, *, request_options: RequestOptionsOrDict | None = None) -> RunResponse:
        """Send a ``GET`` request.

        Args:
            id_: A run's ``sender_batch_id``
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Missing or unknown API key Not found ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.get_payout_run(id_, request_options=request_options))

    def import_payout_run(
        self, body: ImportRunRequest | ImportRunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> RunResponse:
        """Nothing is decided and nothing is sent; every item is recorded as already ``sent``.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Already recorded.

        Raises:
            ApiError: Failed request validation Missing or unknown API key Conflicts with the current state (e.g.
                nothing is on hold, or a ``sender_batch_id`` is already in use) ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.import_payout_run(body, request_options=request_options))

    def screen_payees(
        self, body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ScreenResult:
        """The same decision function ``POST /v1/payout-runs`` uses, so an AI agent that screens a list before paying it
        can't disagree with the real API. Available to the read-only MCP key as well as the full key.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Failed request validation Missing or unknown API key ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.screen_payees(body, request_options=request_options))

    def submit_payout_run(
        self, body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> RunResponse:
        """Resending a run with the same ``sender_batch_id`` is a no-op: it returns what was decided the first time
        without deciding or sending anything again.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            This run's ``sender_batch_id`` was already recorded; nothing new happened.

        Raises:
            ApiError: Failed request validation Missing or unknown API key Conflicts with the current state (e.g.
                nothing is on hold, or a ``sender_batch_id`` is already in use) ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.submit_payout_run(body, request_options=request_options))

    @property
    def with_raw_response(self) -> RunsWithRawResponse:
        return self._with_raw_response


class AsyncRuns:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncRunsWithRawResponse(client, server, auth)

    async def get_payout_run(self, id_: str, *, request_options: RequestOptionsOrDict | None = None) -> RunResponse:
        """Send a ``GET`` request.

        Args:
            id_: A run's ``sender_batch_id``
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Missing or unknown API key Not found ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.get_payout_run(id_, request_options=request_options))

    async def import_payout_run(
        self, body: ImportRunRequest | ImportRunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> RunResponse:
        """Nothing is decided and nothing is sent; every item is recorded as already ``sent``.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Already recorded.

        Raises:
            ApiError: Failed request validation Missing or unknown API key Conflicts with the current state (e.g.
                nothing is on hold, or a ``sender_batch_id`` is already in use) ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.import_payout_run(body, request_options=request_options))

    async def screen_payees(
        self, body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ScreenResult:
        """The same decision function ``POST /v1/payout-runs`` uses, so an AI agent that screens a list before paying it
        can't disagree with the real API. Available to the read-only MCP key as well as the full key.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Failed request validation Missing or unknown API key ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.screen_payees(body, request_options=request_options))

    async def submit_payout_run(
        self, body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> RunResponse:
        """Resending a run with the same ``sender_batch_id`` is a no-op: it returns what was decided the first time
        without deciding or sending anything again.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            This run's ``sender_batch_id`` was already recorded; nothing new happened.

        Raises:
            ApiError: Failed request validation Missing or unknown API key Conflicts with the current state (e.g.
                nothing is on hold, or a ``sender_batch_id`` is already in use) ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.submit_payout_run(body, request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncRunsWithRawResponse:
        return self._with_raw_response


class RunsWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def get_payout_run(
        self, id_: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[RunResponse, GetPayoutRunErrorBody]:
        """Send a ``GET`` request.

        Args:
            id_: A run's ``sender_batch_id``
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/v1/payout-runs/{id}"),
            path_params=[param[str]("id", id_)],
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[RunResponse],
            error_mapper=get_payout_run_error_mapper,
            request_options=request_options,
        )

    def import_payout_run(
        self, body: ImportRunRequest | ImportRunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[RunResponse, ImportPayoutRunErrorBody]:
        """Nothing is decided and nothing is sent; every item is recorded as already ``sent``.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/payout-runs/import"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[ImportRunRequest | ImportRunRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[RunResponse],
            error_mapper=import_payout_run_error_mapper,
            request_options=request_options,
        )

    def screen_payees(
        self, body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ScreenResult, ScreenPayeesErrorBody]:
        """The same decision function ``POST /v1/payout-runs`` uses, so an AI agent that screens a list before paying it
        can't disagree with the real API. Available to the read-only MCP key as well as the full key.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/screen"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[RunRequest | RunRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[ScreenResult],
            error_mapper=screen_payees_error_mapper,
            request_options=request_options,
        )

    def submit_payout_run(
        self, body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[RunResponse, SubmitPayoutRunErrorBody]:
        """Resending a run with the same ``sender_batch_id`` is a no-op: it returns what was decided the first time
        without deciding or sending anything again.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/payout-runs"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[RunRequest | RunRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[RunResponse],
            error_mapper=submit_payout_run_error_mapper,
            request_options=request_options,
        )


class AsyncRunsWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def get_payout_run(
        self, id_: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[RunResponse, GetPayoutRunErrorBody]:
        """Send a ``GET`` request.

        Args:
            id_: A run's ``sender_batch_id``
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/v1/payout-runs/{id}"),
            path_params=[param[str]("id", id_)],
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[RunResponse],
            error_mapper=get_payout_run_error_mapper,
            request_options=request_options,
        )

    async def import_payout_run(
        self, body: ImportRunRequest | ImportRunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[RunResponse, ImportPayoutRunErrorBody]:
        """Nothing is decided and nothing is sent; every item is recorded as already ``sent``.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/payout-runs/import"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[ImportRunRequest | ImportRunRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[RunResponse],
            error_mapper=import_payout_run_error_mapper,
            request_options=request_options,
        )

    async def screen_payees(
        self, body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ScreenResult, ScreenPayeesErrorBody]:
        """The same decision function ``POST /v1/payout-runs`` uses, so an AI agent that screens a list before paying it
        can't disagree with the real API. Available to the read-only MCP key as well as the full key.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/screen"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[RunRequest | RunRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[ScreenResult],
            error_mapper=screen_payees_error_mapper,
            request_options=request_options,
        )

    async def submit_payout_run(
        self, body: RunRequest | RunRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[RunResponse, SubmitPayoutRunErrorBody]:
        """Resending a run with the same ``sender_batch_id`` is a no-op: it returns what was decided the first time
        without deciding or sending anything again.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/payout-runs"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[RunRequest | RunRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[RunResponse],
            error_mapper=submit_payout_run_error_mapper,
            request_options=request_options,
        )
