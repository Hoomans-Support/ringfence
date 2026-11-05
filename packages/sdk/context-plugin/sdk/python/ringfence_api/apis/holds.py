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
from ..errors.confirm_ring_error import ConfirmRingErrorBody, confirm_ring_error_mapper
from ..errors.explain_ring_error import ExplainRingErrorBody, explain_ring_error_mapper
from ..errors.release_holds_error import ReleaseHoldsErrorBody, release_holds_error_mapper
from ..models.confirm_ring_request import ConfirmRingRequest, ConfirmRingRequestDict
from ..models.confirm_ring_response import ConfirmRingResponse
from ..models.release_request import ReleaseRequest, ReleaseRequestDict
from ..models.release_response import ReleaseResponse
from ..models.ring_explanation import RingExplanation
from ..server.server import Server


class Holds:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = HoldsWithRawResponse(client, server, auth)

    def confirm_ring(
        self,
        id_: str,
        body: ConfirmRingRequest | ConfirmRingRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ConfirmRingResponse:
        """The ring's devices and payout addresses also join this deployment's ring network as one-way keyed hashes
        (FR-19), so another program can hold — never block — a repeat on first sight, without ever seeing this program's
        raw data.

        Args:
            id_: A ring id (e.g. ``R-01``), or any other hold group id (e.g. a learned rule's ``R-07``, or a pair's
                ``P-01``)
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Missing or unknown API key Not found ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.confirm_ring(id_, body, request_options=request_options))

    def explain_ring(
        self, id_: str, run_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> RingExplanation:
        """Send a ``GET`` request.

        Args:
            id_: A ring id (e.g. ``R-01``), or any other hold group id (e.g. a learned rule's ``R-07``, or a pair's
                ``P-01``)
            run_id: Value sent with the request.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Missing or unknown API key Not found ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.explain_ring(id_, run_id, request_options=request_options))

    def release_holds(
        self, body: ReleaseRequest | ReleaseRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ReleaseResponse:
        """Send a ``POST`` request.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            This release was already recorded; its batch is returned unchanged.

        Raises:
            ApiError: Failed request validation Missing or unknown API key Conflicts with the current state (e.g.
                nothing is on hold, or a ``sender_batch_id`` is already in use) ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.release_holds(body, request_options=request_options))

    @property
    def with_raw_response(self) -> HoldsWithRawResponse:
        return self._with_raw_response


class AsyncHolds:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncHoldsWithRawResponse(client, server, auth)

    async def confirm_ring(
        self,
        id_: str,
        body: ConfirmRingRequest | ConfirmRingRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ConfirmRingResponse:
        """The ring's devices and payout addresses also join this deployment's ring network as one-way keyed hashes
        (FR-19), so another program can hold — never block — a repeat on first sight, without ever seeing this program's
        raw data.

        Args:
            id_: A ring id (e.g. ``R-01``), or any other hold group id (e.g. a learned rule's ``R-07``, or a pair's
                ``P-01``)
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Missing or unknown API key Not found ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.confirm_ring(id_, body, request_options=request_options))

    async def explain_ring(
        self, id_: str, run_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> RingExplanation:
        """Send a ``GET`` request.

        Args:
            id_: A ring id (e.g. ``R-01``), or any other hold group id (e.g. a learned rule's ``R-07``, or a pair's
                ``P-01``)
            run_id: Value sent with the request.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Missing or unknown API key Not found ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.explain_ring(id_, run_id, request_options=request_options))

    async def release_holds(
        self, body: ReleaseRequest | ReleaseRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ReleaseResponse:
        """Send a ``POST`` request.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            This release was already recorded; its batch is returned unchanged.

        Raises:
            ApiError: Failed request validation Missing or unknown API key Conflicts with the current state (e.g.
                nothing is on hold, or a ``sender_batch_id`` is already in use) ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.release_holds(body, request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncHoldsWithRawResponse:
        return self._with_raw_response


class HoldsWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def confirm_ring(
        self,
        id_: str,
        body: ConfirmRingRequest | ConfirmRingRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ConfirmRingResponse, ConfirmRingErrorBody]:
        """The ring's devices and payout addresses also join this deployment's ring network as one-way keyed hashes
        (FR-19), so another program can hold — never block — a repeat on first sight, without ever seeing this program's
        raw data.

        Args:
            id_: A ring id (e.g. ``R-01``), or any other hold group id (e.g. a learned rule's ``R-07``, or a pair's
                ``P-01``)
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/rings/{id}/confirm"),
            path_params=[param[str]("id", id_)],
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[ConfirmRingRequest | ConfirmRingRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[ConfirmRingResponse],
            error_mapper=confirm_ring_error_mapper,
            request_options=request_options,
        )

    def explain_ring(
        self, id_: str, run_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[RingExplanation, ExplainRingErrorBody]:
        """Send a ``GET`` request.

        Args:
            id_: A ring id (e.g. ``R-01``), or any other hold group id (e.g. a learned rule's ``R-07``, or a pair's
                ``P-01``)
            run_id: Value sent with the request.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/v1/rings/{id}"),
            path_params=[param[str]("id", id_)],
            query_params=[param[str]("run_id", run_id)],
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[RingExplanation],
            error_mapper=explain_ring_error_mapper,
            request_options=request_options,
        )

    def release_holds(
        self, body: ReleaseRequest | ReleaseRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ReleaseResponse, ReleaseHoldsErrorBody]:
        """Send a ``POST`` request.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/holds/release"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[ReleaseRequest | ReleaseRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[ReleaseResponse],
            error_mapper=release_holds_error_mapper,
            request_options=request_options,
        )


class AsyncHoldsWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def confirm_ring(
        self,
        id_: str,
        body: ConfirmRingRequest | ConfirmRingRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ConfirmRingResponse, ConfirmRingErrorBody]:
        """The ring's devices and payout addresses also join this deployment's ring network as one-way keyed hashes
        (FR-19), so another program can hold — never block — a repeat on first sight, without ever seeing this program's
        raw data.

        Args:
            id_: A ring id (e.g. ``R-01``), or any other hold group id (e.g. a learned rule's ``R-07``, or a pair's
                ``P-01``)
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/rings/{id}/confirm"),
            path_params=[param[str]("id", id_)],
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[ConfirmRingRequest | ConfirmRingRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[ConfirmRingResponse],
            error_mapper=confirm_ring_error_mapper,
            request_options=request_options,
        )

    async def explain_ring(
        self, id_: str, run_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[RingExplanation, ExplainRingErrorBody]:
        """Send a ``GET`` request.

        Args:
            id_: A ring id (e.g. ``R-01``), or any other hold group id (e.g. a learned rule's ``R-07``, or a pair's
                ``P-01``)
            run_id: Value sent with the request.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/v1/rings/{id}"),
            path_params=[param[str]("id", id_)],
            query_params=[param[str]("run_id", run_id)],
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[RingExplanation],
            error_mapper=explain_ring_error_mapper,
            request_options=request_options,
        )

    async def release_holds(
        self, body: ReleaseRequest | ReleaseRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ReleaseResponse, ReleaseHoldsErrorBody]:
        """Send a ``POST`` request.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/holds/release"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[ReleaseRequest | ReleaseRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[ReleaseResponse],
            error_mapper=release_holds_error_mapper,
            request_options=request_options,
        )
