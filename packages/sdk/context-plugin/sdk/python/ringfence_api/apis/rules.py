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
from ..errors.approve_rule_error import ApproveRuleErrorBody, approve_rule_error_mapper
from ..errors.list_rules_error import ListRulesErrorBody, list_rules_error_mapper
from ..errors.propose_rule_error import ProposeRuleErrorBody, propose_rule_error_mapper
from ..models.approve_rule_request import ApproveRuleRequest, ApproveRuleRequestDict
from ..models.propose_rule_request import ProposeRuleRequest, ProposeRuleRequestDict
from ..models.stored_rule import StoredRule
from ..server.server import Server


class Rules:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = RulesWithRawResponse(client, server, auth)

    def approve_rule(
        self,
        id_: str,
        body: ApproveRuleRequest | ApproveRuleRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> StoredRule:
        """Send a ``POST`` request.

        Args:
            id_: A rule id, e.g. ``R-07``
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Approved (or already was).

        Raises:
            ApiError: Missing or unknown API key Not found Flagged and ``acknowledge_flags`` wasn't set. ``error`` is
                ``Error | RawError``."""
        return unwrap(self._with_raw_response.approve_rule(id_, body, request_options=request_options))

    def list_rules(self, *, request_options: RequestOptionsOrDict | None = None) -> list[StoredRule]:
        """Send a ``GET`` request.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Missing or unknown API key ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.list_rules(request_options=request_options))

    def propose_rule(
        self, body: ProposeRuleRequest | ProposeRuleRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> StoredRule:
        """Send a ``POST`` request.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Proposed. ``flags`` is non-empty when it needs a deliberate second look before approval.

        Raises:
            ApiError: Fails the schema check (``validateRule``) — e.g. a PAY action, an unknown signal, or an empty
                condition list. Missing or unknown API key ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.propose_rule(body, request_options=request_options))

    @property
    def with_raw_response(self) -> RulesWithRawResponse:
        return self._with_raw_response


class AsyncRules:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncRulesWithRawResponse(client, server, auth)

    async def approve_rule(
        self,
        id_: str,
        body: ApproveRuleRequest | ApproveRuleRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> StoredRule:
        """Send a ``POST`` request.

        Args:
            id_: A rule id, e.g. ``R-07``
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Approved (or already was).

        Raises:
            ApiError: Missing or unknown API key Not found Flagged and ``acknowledge_flags`` wasn't set. ``error`` is
                ``Error | RawError``."""
        return unwrap(await self._with_raw_response.approve_rule(id_, body, request_options=request_options))

    async def list_rules(self, *, request_options: RequestOptionsOrDict | None = None) -> list[StoredRule]:
        """Send a ``GET`` request.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            OK

        Raises:
            ApiError: Missing or unknown API key ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.list_rules(request_options=request_options))

    async def propose_rule(
        self, body: ProposeRuleRequest | ProposeRuleRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> StoredRule:
        """Send a ``POST`` request.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Proposed. ``flags`` is non-empty when it needs a deliberate second look before approval.

        Raises:
            ApiError: Fails the schema check (``validateRule``) — e.g. a PAY action, an unknown signal, or an empty
                condition list. Missing or unknown API key ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.propose_rule(body, request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncRulesWithRawResponse:
        return self._with_raw_response


class RulesWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def approve_rule(
        self,
        id_: str,
        body: ApproveRuleRequest | ApproveRuleRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[StoredRule, ApproveRuleErrorBody]:
        """Send a ``POST`` request.

        Args:
            id_: A rule id, e.g. ``R-07``
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/rules/{id}/approve"),
            path_params=[param[str]("id", id_)],
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[ApproveRuleRequest | ApproveRuleRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[StoredRule],
            error_mapper=approve_rule_error_mapper,
            request_options=request_options,
        )

    def list_rules(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[StoredRule], ListRulesErrorBody]:
        """Send a ``GET`` request.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/v1/rules"),
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[list[StoredRule]],
            error_mapper=list_rules_error_mapper,
            request_options=request_options,
        )

    def propose_rule(
        self, body: ProposeRuleRequest | ProposeRuleRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[StoredRule, ProposeRuleErrorBody]:
        """Send a ``POST`` request.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/rules"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[ProposeRuleRequest | ProposeRuleRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=json_decoder[StoredRule],
            error_mapper=propose_rule_error_mapper,
            request_options=request_options,
        )


class AsyncRulesWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def approve_rule(
        self,
        id_: str,
        body: ApproveRuleRequest | ApproveRuleRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[StoredRule, ApproveRuleErrorBody]:
        """Send a ``POST`` request.

        Args:
            id_: A rule id, e.g. ``R-07``
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/rules/{id}/approve"),
            path_params=[param[str]("id", id_)],
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[ApproveRuleRequest | ApproveRuleRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[StoredRule],
            error_mapper=approve_rule_error_mapper,
            request_options=request_options,
        )

    async def list_rules(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[StoredRule], ListRulesErrorBody]:
        """Send a ``GET`` request.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/v1/rules"),
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[list[StoredRule]],
            error_mapper=list_rules_error_mapper,
            request_options=request_options,
        )

    async def propose_rule(
        self, body: ProposeRuleRequest | ProposeRuleRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[StoredRule, ProposeRuleErrorBody]:
        """Send a ``POST`` request.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/v1/rules"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[ProposeRuleRequest | ProposeRuleRequestDict](body),
            auth_scheme=self._auth.bearer_auth,
            decoder=async_json_decoder[StoredRule],
            error_mapper=propose_rule_error_mapper,
            request_options=request_options,
        )
