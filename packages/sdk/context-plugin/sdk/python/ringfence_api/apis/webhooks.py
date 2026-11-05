from __future__ import annotations

from typing import Any
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
from ..errors.list_webhook_events_error import ListWebhookEventsErrorBody, list_webhook_events_error_mapper
from ..errors.receive_paypal_webhook_error import ReceivePaypalWebhookErrorBody, receive_paypal_webhook_error_mapper
from ..models.webhook_ack import WebhookAck
from ..models.webhook_event_log_entry import WebhookEventLogEntry
from ..server.server import Server


class Webhooks:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = WebhooksWithRawResponse(client, server, auth)

    def list_webhook_events(self, *, request_options: RequestOptionsOrDict | None = None) -> list[WebhookEventLogEntry]:
        """Guarded by a separate admin bearer token (``ADMIN_TOKEN``), not a program's API key. Answers 404 if no admin
        token is configured.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Not found ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.list_webhook_events(request_options=request_options))

    def receive_paypal_webhook(self, body: Any, *, request_options: RequestOptionsOrDict | None = None) -> WebhookAck:
        """No API key — PayPal's own signature on the request is the authentication.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verified (applied, or a recognized redelivery).

        Raises:
            ApiError: Signature did not verify. ``error`` is ``WebhookRejected | RawError``."""
        return unwrap(self._with_raw_response.receive_paypal_webhook(body, request_options=request_options))

    @property
    def with_raw_response(self) -> WebhooksWithRawResponse:
        return self._with_raw_response


class AsyncWebhooks:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncWebhooksWithRawResponse(client, server, auth)

    async def list_webhook_events(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> list[WebhookEventLogEntry]:
        """Guarded by a separate admin bearer token (``ADMIN_TOKEN``), not a program's API key. Answers 404 if no admin
        token is configured.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Not found ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.list_webhook_events(request_options=request_options))

    async def receive_paypal_webhook(
        self, body: Any, *, request_options: RequestOptionsOrDict | None = None
    ) -> WebhookAck:
        """No API key — PayPal's own signature on the request is the authentication.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verified (applied, or a recognized redelivery).

        Raises:
            ApiError: Signature did not verify. ``error`` is ``WebhookRejected | RawError``."""
        return unwrap(await self._with_raw_response.receive_paypal_webhook(body, request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncWebhooksWithRawResponse:
        return self._with_raw_response


class WebhooksWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def list_webhook_events(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[WebhookEventLogEntry], ListWebhookEventsErrorBody]:
        """Guarded by a separate admin bearer token (``ADMIN_TOKEN``), not a program's API key. Answers 404 if no admin
        token is configured.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/v1/webhooks/events"),
            auth_scheme=self._auth.admin_bearer_auth,
            decoder=json_decoder[list[WebhookEventLogEntry]],
            error_mapper=list_webhook_events_error_mapper,
            request_options=request_options,
        )

    def receive_paypal_webhook(
        self, body: Any, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[WebhookAck, ReceivePaypalWebhookErrorBody]:
        """No API key — PayPal's own signature on the request is the authentication.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/webhooks/paypal"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[Any](body),
            decoder=json_decoder[WebhookAck],
            error_mapper=receive_paypal_webhook_error_mapper,
            request_options=request_options,
        )


class AsyncWebhooksWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def list_webhook_events(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[WebhookEventLogEntry], ListWebhookEventsErrorBody]:
        """Guarded by a separate admin bearer token (``ADMIN_TOKEN``), not a program's API key. Answers 404 if no admin
        token is configured.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/v1/webhooks/events"),
            auth_scheme=self._auth.admin_bearer_auth,
            decoder=async_json_decoder[list[WebhookEventLogEntry]],
            error_mapper=list_webhook_events_error_mapper,
            request_options=request_options,
        )

    async def receive_paypal_webhook(
        self, body: Any, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[WebhookAck, ReceivePaypalWebhookErrorBody]:
        """No API key — PayPal's own signature on the request is the authentication.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/webhooks/paypal"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[Any](body),
            decoder=async_json_decoder[WebhookAck],
            error_mapper=receive_paypal_webhook_error_mapper,
            request_options=request_options,
        )
