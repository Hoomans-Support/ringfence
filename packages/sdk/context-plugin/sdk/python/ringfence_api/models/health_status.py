from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class HealthStatus(SdkBaseModel):
    ok: Optional[bool] = UNSET
    sandbox: Optional[bool] = UNSET


class HealthStatusDict(TypedDict):
    ok: NotRequired[bool]
    sandbox: NotRequired[bool]
