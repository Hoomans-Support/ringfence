from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class ConfirmRingRequest(SdkBaseModel):
    run_id: str
    confirmed_by: Optional[str] = UNSET


class ConfirmRingRequestDict(TypedDict):
    run_id: str
    confirmed_by: NotRequired[str]
