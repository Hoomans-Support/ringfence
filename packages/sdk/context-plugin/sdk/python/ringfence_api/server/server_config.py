from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..core import UrlTemplate, param
from .environment import Environment


class ProductionConfig(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    base_url: str = "http://localhost:3000"


class Environment2Config(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    base_url: str = "https://{host}"
    host: str = "your-api-host.onrender.com"


class ServerConfig(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    production: ProductionConfig = Field(default_factory=ProductionConfig)
    environment2: Environment2Config = Field(default_factory=Environment2Config)

    def resolve(self, environment: Environment, path: str) -> UrlTemplate:
        if environment == "production":
            production = self.production
            return UrlTemplate(base_url=production.base_url, path=path)
        environment2 = self.environment2
        return UrlTemplate(base_url=environment2.base_url, path=path, variables=[param[str]("host", environment2.host)])
