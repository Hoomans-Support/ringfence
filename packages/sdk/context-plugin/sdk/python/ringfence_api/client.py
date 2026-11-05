from __future__ import annotations

from functools import cached_property
from types import TracebackType

from typing_extensions import Self

from .apis.events import Events
from .apis.holds import Holds
from .apis.rules import Rules
from .apis.runs import Runs
from .apis.system import System
from .apis.webhooks import Webhooks
from .auth import AuthSchemes
from .base_client import DEFAULT_TIMEOUT, BaseRingfenceApiClient
from .core import (
    OPERATING_SYSTEM,
    PYTHON_RUNTIME,
    BearerAuthScheme,
    HttpClient,
    Httpx2Client,
    LoggingOptionsOrDict,
    RawClient,
    RetryOptionsOrDict,
    no_auth,
    param,
)
from .server.environment import Environment


class RingfenceApiClient(BaseRingfenceApiClient[RawClient]):
    def __init__(
        self,
        *,
        environment: Environment = "production",
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        retry_options: int | RetryOptionsOrDict | None = None,
        logging_options: LoggingOptionsOrDict | None = None,
        custom_http_client: HttpClient | None = None,
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
        self._raw_client = RawClient(
            http_client=custom_http_client if custom_http_client is not None else Httpx2Client(timeout=timeout),
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
        self._auth = AuthSchemes(
            bearer_auth=BearerAuthScheme(bearer_auth) if bearer_auth is not None else no_auth,
            admin_bearer_auth=BearerAuthScheme(admin_bearer_auth) if admin_bearer_auth is not None else no_auth,
        )

    @cached_property
    def events(self) -> Events:
        return Events(self._raw_client, self._server, self._auth)

    @cached_property
    def holds(self) -> Holds:
        return Holds(self._raw_client, self._server, self._auth)

    @cached_property
    def rules(self) -> Rules:
        return Rules(self._raw_client, self._server, self._auth)

    @cached_property
    def runs(self) -> Runs:
        return Runs(self._raw_client, self._server, self._auth)

    @cached_property
    def system(self) -> System:
        return System(self._raw_client, self._server)

    @cached_property
    def webhooks(self) -> Webhooks:
        return Webhooks(self._raw_client, self._server, self._auth)

    def close(self) -> None:
        self._raw_client.http_client.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: TracebackType | None
    ) -> None:
        self.close()


Client = RingfenceApiClient
