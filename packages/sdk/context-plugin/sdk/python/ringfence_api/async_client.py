from __future__ import annotations

from functools import cached_property
from types import TracebackType

from typing_extensions import Self

from .apis.events import AsyncEvents
from .apis.holds import AsyncHolds
from .apis.rules import AsyncRules
from .apis.runs import AsyncRuns
from .apis.system import AsyncSystem
from .apis.webhooks import AsyncWebhooks
from .auth import AsyncAuthSchemes
from .base_client import DEFAULT_TIMEOUT, BaseRingfenceApiClient
from .core import (
    OPERATING_SYSTEM,
    PYTHON_RUNTIME,
    AsyncHttpClient,
    AsyncHttpx2Client,
    AsyncRawClient,
    BearerAuthScheme,
    LoggingOptionsOrDict,
    RetryOptionsOrDict,
    no_auth,
    param,
)
from .server.environment import Environment


class AsyncRingfenceApiClient(BaseRingfenceApiClient[AsyncRawClient]):
    def __init__(
        self,
        *,
        environment: Environment = "production",
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        retry_options: int | RetryOptionsOrDict | None = None,
        logging_options: LoggingOptionsOrDict | None = None,
        custom_async_http_client: AsyncHttpClient | None = None,
        bearer_auth: str | None = None,
        admin_bearer_auth: str | None = None,
    ) -> None:
        super().__init__(
            environment=environment,
            base_url=base_url,
            timeout=timeout,
            retry_options=retry_options,
            logging_options=logging_options,
        )
        self._raw_client = AsyncRawClient(
            http_client=(
                custom_async_http_client if custom_async_http_client is not None else AsyncHttpx2Client(timeout=timeout)
            ),
            retry_options=self._retry_options,
            logging_options=self._logging_options,
            global_headers=[
                param[str]("User-Agent", "RingfenceApiClient/0.0.1 Python"),
                param[str]("X-APIMatic-Lang", "Python"),
                param[str]("X-APIMatic-Package-Version", "0.0.1"),
                param[str]("X-APIMatic-Gen-Version", "4.0.0"),
                param[str]("X-APIMatic-OS", OPERATING_SYSTEM),
                param[str]("X-APIMatic-Runtime", PYTHON_RUNTIME),
            ],
        )
        self._auth = AsyncAuthSchemes(
            bearer_auth=BearerAuthScheme(bearer_auth) if bearer_auth is not None else no_auth,
            admin_bearer_auth=BearerAuthScheme(admin_bearer_auth) if admin_bearer_auth is not None else no_auth,
        )

    @cached_property
    def events(self) -> AsyncEvents:
        return AsyncEvents(self._raw_client, self._server, self._auth)

    @cached_property
    def holds(self) -> AsyncHolds:
        return AsyncHolds(self._raw_client, self._server, self._auth)

    @cached_property
    def rules(self) -> AsyncRules:
        return AsyncRules(self._raw_client, self._server, self._auth)

    @cached_property
    def runs(self) -> AsyncRuns:
        return AsyncRuns(self._raw_client, self._server, self._auth)

    @cached_property
    def system(self) -> AsyncSystem:
        return AsyncSystem(self._raw_client, self._server)

    @cached_property
    def webhooks(self) -> AsyncWebhooks:
        return AsyncWebhooks(self._raw_client, self._server, self._auth)

    async def aclose(self) -> None:
        await self._raw_client.http_client.aclose()

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: TracebackType | None
    ) -> None:
        await self.aclose()


AsyncClient = AsyncRingfenceApiClient
