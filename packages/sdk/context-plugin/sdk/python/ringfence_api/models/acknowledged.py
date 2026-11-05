from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class Acknowledged(SdkBaseModel):
    ok: Optional[bool] = UNSET


class AcknowledgedDict(TypedDict):
    ok: NotRequired[bool]
